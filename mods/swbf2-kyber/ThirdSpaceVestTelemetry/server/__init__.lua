local json = require "json"

local PORT = 5051
local SCHEMA = 1
local MAX_CLIENTS = 16
local MAX_ACCEPTS_PER_UPDATE = 4
local MAX_READ_BYTES = 2048
local MAX_LINE_BYTES = 8192
local MAX_QUEUED_BYTES = 65536
local MAX_SENDS_PER_UPDATE = 8
local ROSTER_RECONCILE_SECONDS = 5

local listener = SocketManager.Create(PORT)
local clients = {}
local rosterDirty = true
local rosterElapsed = 0
local epochCounter = 0

local function newEpoch()
    epochCounter = epochCounter + 1
    return string.format("%d-%d-%d", os.time(), epochCounter, math.random(100000, 999999))
end

local function playerId(player)
    return tostring(player.playerId)
end

local function currentRoster()
    local result = {}
    local players = PlayerManager.GetPlayers() or {}
    for _, player in ipairs(players) do
        table.insert(result, {
            player_id = playerId(player),
            name = player.name,
            is_bot = player.isBot == true,
        })
    end
    return result
end

local function findPlayer(id)
    for _, player in ipairs(PlayerManager.GetPlayers() or {}) do
        if playerId(player) == id then
            return player
        end
    end
    return nil
end

local function queueRecord(client, eventName, fields)
    fields = fields or {}
    client.seq = client.seq + 1
    fields.schema = SCHEMA
    fields.event = eventName
    fields.epoch = client.epoch
    fields.seq = client.seq
    local encoded = json.encode(fields) .. "\n"
    if client.queuedBytes + #encoded > MAX_QUEUED_BYTES then
        return false
    end
    table.insert(client.outbound, encoded)
    client.queuedBytes = client.queuedBytes + #encoded
    return true
end

local function queueRoster(client, roster)
    roster = roster or currentRoster()
    if client.subscribedId ~= nil then
        local stillPresent = false
        for _, player in ipairs(roster) do
            if player.player_id == client.subscribedId then
                stillPresent = true
                break
            end
        end
        if not stillPresent then
            client.subscribedId = nil
        end
    end
    return queueRecord(client, "player_list", { players = roster })
end

local function removeClient(index, reason)
    local client = clients[index]
    if client ~= nil then
        print(string.format("[ThirdSpaceVest] Client disconnected: %s", reason or "closed"))
        -- Let userdata garbage collection close the socket exactly once.
        client.socket = nil
    end
    table.remove(clients, index)
end

local function acceptClients()
    for _ = 1, MAX_ACCEPTS_PER_UPDATE do
        if #clients >= MAX_CLIENTS then
            return
        end
        local socket = listener:Accept()
        if socket == nil then
            return
        end
        local client = {
            socket = socket,
            epoch = newEpoch(),
            seq = 0,
            recvBuffer = "",
            outbound = {},
            queuedBytes = 0,
            sendErrors = 0,
            subscribedId = nil,
        }
        table.insert(clients, client)
        queueRecord(client, "hello", { server_name = "KYBER LAN server" })
        queueRoster(client)
        print("[ThirdSpaceVest] Vest daemon connected")
    end
end

local function handleCommand(client, command)
    if type(command) ~= "table" or command.schema ~= SCHEMA then
        queueRecord(client, "error", { message = "Unsupported telemetry schema" })
        return
    end
    if command.action == "get_player_list" then
        queueRoster(client)
        return
    end
    if command.action ~= "subscribe" or type(command.player_id) ~= "string" then
        queueRecord(client, "error", { message = "Only subscribe/get_player_list actions are supported" })
        return
    end

    local player = findPlayer(command.player_id)
    if player == nil or player.isBot == true then
        client.subscribedId = nil
        queueRecord(client, "error", { message = "Requested player is not in the active roster" })
        return
    end

    client.subscribedId = command.player_id
    queueRecord(client, "subscribed", {
        player_id = command.player_id,
        name = player.name,
    })
end

local function processInput(client, chunk)
    client.recvBuffer = client.recvBuffer .. chunk
    if #client.recvBuffer > MAX_LINE_BYTES and not client.recvBuffer:find("\n", 1, true) then
        return false, "line too long"
    end

    while true do
        local newline = client.recvBuffer:find("\n", 1, true)
        if newline == nil then
            return true
        end
        local line = client.recvBuffer:sub(1, newline - 1):gsub("\r$", "")
        client.recvBuffer = client.recvBuffer:sub(newline + 1)
        if #line > MAX_LINE_BYTES then
            return false, "line too long"
        end
        if #line > 0 then
            local ok, command = pcall(json.decode, line)
            if not ok then
                return false, "invalid JSON"
            end
            handleCommand(client, command)
        end
    end
end

local function receiveClient(client)
    local ok, chunk = pcall(function()
        return client.socket:Recv(MAX_READ_BYTES)
    end)
    if not ok then
        return false, "receive error"
    end
    if chunk == nil then
        return true
    end
    if #chunk == 0 then
        return false, "peer closed"
    end
    return processInput(client, chunk)
end

local function flushClient(client)
    local sends = 0
    while #client.outbound > 0 and sends < MAX_SENDS_PER_UPDATE do
        local pending = client.outbound[1]
        local ok, sent = pcall(function()
            return client.socket:Send(pending)
        end)
        if not ok then
            client.sendErrors = client.sendErrors + 1
            return client.sendErrors < 3
        end
        if sent == nil or sent == 0 then
            return true
        end
        client.sendErrors = 0
        client.queuedBytes = client.queuedBytes - sent
        if sent < #pending then
            client.outbound[1] = pending:sub(sent + 1)
            return true
        end
        table.remove(client.outbound, 1)
        sends = sends + 1
    end
    return true
end

local function broadcastRoster()
    local roster = currentRoster()
    for _, client in ipairs(clients) do
        if not queueRoster(client, roster) then
            client.overflowed = true
        end
    end
end

local function fieldVector(value)
    if type(value) ~= "table" then
        return nil
    end
    local x = value.x or value[1]
    local y = value.y or value[2]
    local z = value.z or value[3]
    if type(x) ~= "number" or type(y) ~= "number" or type(z) ~= "number" then
        return nil
    end
    return { x, y, z }
end

local function queueForPlayer(id, eventName, fields)
    id = tostring(id)
    for _, client in ipairs(clients) do
        if client.subscribedId == id then
            if not queueRecord(client, eventName, fields) then
                client.overflowed = true
            end
        end
    end
end

EventManager.Listen("ServerPlayer:Joined", function(_player)
    rosterDirty = true
end)

EventManager.Listen("ServerPlayer:Disconnect", function(_player)
    -- KYBER fires this before removing the player; reconcile next update.
    rosterDirty = true
end)

EventManager.Listen("ServerPlayer:Spawned", function(player)
    queueForPlayer(playerId(player), "player_spawned", {
        player_id = playerId(player),
    })
end)

EventManager.Listen("ServerPlayer:Killed", function(victim, attacker, weapon)
    queueForPlayer(playerId(victim), "player_killed", {
        victim_id = playerId(victim),
        attacker_id = attacker and playerId(attacker) or nil,
        weapon = weapon,
    })
end)

-- These authoritative events are supplied by the companion native KYBER
-- extension after its runtime hook validation has passed.
EventManager.Listen("ServerPlayer:ShotFired", function(player, weapon)
    queueForPlayer(playerId(player), "shot_fired", {
        player_id = playerId(player),
        weapon = weapon,
    })
end)

EventManager.Listen(
    "ServerPlayer:DamageApplied",
    function(victim, attacker, weapon, amount, healthRemaining, sourcePosition, victimPosition, victimForward)
        queueForPlayer(playerId(victim), "damage_received", {
            victim_id = playerId(victim),
            attacker_id = attacker and playerId(attacker) or nil,
            weapon = weapon,
            amount = amount,
            health_remaining = healthRemaining,
            source_position = fieldVector(sourcePosition),
            victim_position = fieldVector(victimPosition),
            victim_forward = fieldVector(victimForward),
        })
    end
)

EventManager.Listen("Server:UpdatePre", function(deltaSeconds)
    acceptClients()

    if rosterDirty then
        rosterDirty = false
        rosterElapsed = 0
        broadcastRoster()
    else
        rosterElapsed = rosterElapsed + deltaSeconds
        if rosterElapsed >= ROSTER_RECONCILE_SECONDS then
            rosterElapsed = 0
            broadcastRoster()
        end
    end

    local index = #clients
    while index >= 1 do
        local client = clients[index]
        local keep, reason = receiveClient(client)
        if keep and not client.overflowed then
            keep = flushClient(client)
            reason = keep and nil or "send error"
        elseif client.overflowed then
            keep = false
            reason = "outbound queue overflow"
        end
        if not keep then
            removeClient(index, reason)
        end
        index = index - 1
    end
end)

print(string.format("[ThirdSpaceVest] KYBER telemetry listening on TCP %d", PORT))
