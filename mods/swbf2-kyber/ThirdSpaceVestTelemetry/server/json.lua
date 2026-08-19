-- Minimal JSON codec for the Third Space KYBER telemetry protocol.
-- Supports strings, finite numbers, booleans, nil/null, arrays, and objects.

local json = {}

local escapes = {
    ['"'] = '\\"',
    ['\\'] = '\\\\',
    ['\b'] = '\\b',
    ['\f'] = '\\f',
    ['\n'] = '\\n',
    ['\r'] = '\\r',
    ['\t'] = '\\t',
}

local function encodeString(value)
    return '"' .. value:gsub('[%z\1-\31\\"]', function(char)
        return escapes[char] or string.format("\\u%04x", string.byte(char))
    end) .. '"'
end

local function isArray(value)
    local maximum = 0
    local count = 0
    for key, _ in pairs(value) do
        if type(key) ~= "number" or key < 1 or key % 1 ~= 0 then
            return false, 0
        end
        maximum = math.max(maximum, key)
        count = count + 1
    end
    return maximum == count, maximum
end

local function encodeValue(value, seen)
    local valueType = type(value)
    if value == nil then
        return "null"
    elseif valueType == "boolean" then
        return value and "true" or "false"
    elseif valueType == "number" then
        if value ~= value or value == math.huge or value == -math.huge then
            error("Cannot encode non-finite JSON number")
        end
        return tostring(value)
    elseif valueType == "string" then
        return encodeString(value)
    elseif valueType ~= "table" then
        error("Cannot encode JSON value of type " .. valueType)
    end

    if seen[value] then
        error("Cannot encode recursive JSON table")
    end
    seen[value] = true

    local array, length = isArray(value)
    local parts = {}
    if array then
        for index = 1, length do
            parts[index] = encodeValue(value[index], seen)
        end
        seen[value] = nil
        return "[" .. table.concat(parts, ",") .. "]"
    end

    for key, item in pairs(value) do
        if type(key) ~= "string" then
            error("JSON object keys must be strings")
        end
        table.insert(parts, encodeString(key) .. ":" .. encodeValue(item, seen))
    end
    seen[value] = nil
    return "{" .. table.concat(parts, ",") .. "}"
end

function json.encode(value)
    return encodeValue(value, {})
end

local function decodeError(source, position, message)
    error(string.format("JSON decode error at %d: %s", position, message))
end

local function skipWhitespace(source, position)
    local _, finish = source:find("^[ \n\r\t]*", position)
    return (finish or position - 1) + 1
end

local parseValue

local function parseString(source, position)
    position = position + 1
    local parts = {}
    local start = position
    while position <= #source do
        local char = source:sub(position, position)
        if char == '"' then
            table.insert(parts, source:sub(start, position - 1))
            return table.concat(parts), position + 1
        elseif char == "\\" then
            table.insert(parts, source:sub(start, position - 1))
            local escape = source:sub(position + 1, position + 1)
            local replacements = {
                ['"'] = '"', ['\\'] = '\\', ['/'] = '/',
                b = '\b', f = '\f', n = '\n', r = '\r', t = '\t',
            }
            if replacements[escape] then
                table.insert(parts, replacements[escape])
                position = position + 2
            elseif escape == "u" then
                local hex = source:sub(position + 2, position + 5)
                local codepoint = tonumber(hex, 16)
                if not codepoint then
                    decodeError(source, position, "invalid Unicode escape")
                end
                if codepoint <= 0x7f then
                    table.insert(parts, string.char(codepoint))
                elseif codepoint <= 0x7ff then
                    table.insert(parts, string.char(
                        0xc0 + math.floor(codepoint / 0x40),
                        0x80 + (codepoint % 0x40)
                    ))
                else
                    table.insert(parts, string.char(
                        0xe0 + math.floor(codepoint / 0x1000),
                        0x80 + (math.floor(codepoint / 0x40) % 0x40),
                        0x80 + (codepoint % 0x40)
                    ))
                end
                position = position + 6
            else
                decodeError(source, position, "invalid escape")
            end
            start = position
        elseif string.byte(char) < 32 then
            decodeError(source, position, "control character in string")
        else
            position = position + 1
        end
    end
    decodeError(source, position, "unterminated string")
end

local function parseArray(source, position)
    local result = {}
    position = skipWhitespace(source, position + 1)
    if source:sub(position, position) == "]" then
        return result, position + 1
    end
    while true do
        local value
        value, position = parseValue(source, position)
        table.insert(result, value)
        position = skipWhitespace(source, position)
        local char = source:sub(position, position)
        if char == "]" then
            return result, position + 1
        elseif char ~= "," then
            decodeError(source, position, "expected ',' or ']'")
        end
        position = skipWhitespace(source, position + 1)
    end
end

local function parseObject(source, position)
    local result = {}
    position = skipWhitespace(source, position + 1)
    if source:sub(position, position) == "}" then
        return result, position + 1
    end
    while true do
        if source:sub(position, position) ~= '"' then
            decodeError(source, position, "expected string key")
        end
        local key
        key, position = parseString(source, position)
        position = skipWhitespace(source, position)
        if source:sub(position, position) ~= ":" then
            decodeError(source, position, "expected ':'")
        end
        local value
        value, position = parseValue(source, skipWhitespace(source, position + 1))
        result[key] = value
        position = skipWhitespace(source, position)
        local char = source:sub(position, position)
        if char == "}" then
            return result, position + 1
        elseif char ~= "," then
            decodeError(source, position, "expected ',' or '}'")
        end
        position = skipWhitespace(source, position + 1)
    end
end

parseValue = function(source, position)
    position = skipWhitespace(source, position)
    local char = source:sub(position, position)
    if char == '"' then
        return parseString(source, position)
    elseif char == "{" then
        return parseObject(source, position)
    elseif char == "[" then
        return parseArray(source, position)
    end

    local literals = { ["true"] = true, ["false"] = false }
    for literal, value in pairs(literals) do
        if source:sub(position, position + #literal - 1) == literal then
            return value, position + #literal
        end
    end
    if source:sub(position, position + 3) == "null" then
        return nil, position + 4
    end

    local numberText = source:match("^-?%d+%.?%d*[eE]?[+-]?%d*", position)
    if numberText and #numberText > 0 then
        local number = tonumber(numberText)
        if number then
            return number, position + #numberText
        end
    end
    decodeError(source, position, "unexpected token")
end

function json.decode(source)
    if type(source) ~= "string" then
        error("JSON input must be a string")
    end
    local value, position = parseValue(source, 1)
    position = skipWhitespace(source, position)
    if position <= #source then
        decodeError(source, position, "trailing data")
    end
    return value
end

return json
