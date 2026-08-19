# ThirdSpaceVestTelemetry

KYBER server plugin for Third Space Vest LAN telemetry.

Enable this plugin on a trusted-LAN KYBER dedicated server and allow inbound TCP
port `5051` from that LAN only. Do not expose the port to the Internet.

The plugin provides roster discovery, per-player subscriptions, spawn/death
events, and the transport for companion native accepted-shot and applied-damage
events. See the parent `swbf2-kyber/README.md` in the application bundle for the
native-extension requirements and safety boundary.
