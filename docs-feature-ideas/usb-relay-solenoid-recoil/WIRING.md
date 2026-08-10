# USB LC Relay + Solenoid Recoil — Wiring Guide

This guide covers wiring a **USB LC serial relay module** (e.g. Amazon B0B4HMDK7Q) to a **solenoid** for mechanical recoil prototyping with Third Space Vest tooling.

Software lives on branch `feat/usb-relay-solenoid-recoil`:
- UI: **Relay** page in the Electron app
- CLI: `python -m modern_third_space.cli relay …`

---

## Safety first

- **Do not** power the solenoid from the USB 5 V rail. Solenoids draw amps; USB cannot supply that safely.
- Use a **separate DC supply** rated for your solenoid’s voltage and current (check the coil label: e.g. 12 V / 1 A).
- Prefer **short pulses** (20–50 ms to start). Leaving the coil ON will overheat it.
- Add a **flyback (freewheeling) diode** across the solenoid if the relay board does not already include load protection for inductive kicks.
- Disconnect USB and the coil supply before changing wires.
- Keep fingers clear of the plunger when pulsing.

---

## What the USB relay module actually does

The USB stick is a **serial-controlled relay**, not a motor driver.

| Side | Role |
|------|------|
| USB plug | Communicates with the PC (COM port, 9600 baud). Powers the *relay coil electronics* only. |
| Screw terminals | Dry contact switch: typically **COM** (common), **NO** (normally open), sometimes **NC** (normally closed). |

When software sends **ON**, the relay closes **COM ↔ NO**. That completes *your* external circuit (battery/PSU → solenoid).

```
  PC ──USB──► [ LC Relay Module ]
                    │
                    │  COM ──► to solenoid circuit
                    │  NO  ──► to solenoid circuit
                    │
              (USB does NOT feed the solenoid)
```

---

## Parts checklist

- USB LC relay module (1-channel)
- Solenoid (DC preferred for simple switching; know V and A)
- DC power supply matching the solenoid
- Wire suitable for the solenoid current
- Flyback diode (e.g. 1N4007 or Schottky rated above coil current) — strongly recommended
- Optional: inline fuse on the solenoid supply positive

---

## Your verified kit (JF-0826B)

This combination is a good match for pulsed recoil:

| Part | Spec | Notes |
|------|------|--------|
| **Solenoid** | JF-0826B, **DC 12 V**, **2 A**, push, 20 N / 10 mm | Voltage matches the pack; 2 A is within a 3 A max pack for **short pulses** |
| **Battery bank** | 12–12.6 V out, **1–3 A max**, 2800 mAh | Use as solenoid supply only — not USB power |
| **Diode** | **1N4007** (1 A, 1000 V, DO-41) | Correct flyback diode for intermittent pulses |
| **USB LC relay** | Serial 9600 baud | Switches the 12 V circuit via COM/NO |

**Pulse guidance for this coil:** start at **20–40 ms**, then try **50–80 ms** if the hit feels soft. Do **not** hold ON — at 2 A continuous the coil and pack will heat / sag quickly.

**Push-type note:** the plunger extends when energized. Mount so that stroke hits your recoil mass/plate within the 10 mm travel; leave a small air gap at rest so the slug can accelerate.

```
  Battery +  ──────┬─────────────── Solenoid lead A
                   │
                   │   1N4007 stripe (cathode) on + side
                   │        │
                   │     [diode]
                   │        │
                   │   1N4007 anode on return side
                   │
  Battery −  ─── Relay COM
  Relay NO   ─── Solenoid lead B

  PC USB ─── LC relay module (control only)
```

Optional: 3 A fast-blow fuse on Battery + for extra safety.

---

## Wiring diagram (recommended)

Use the relay as a **low-side or high-side switch** in series with the solenoid. Most DIY setups switch the **positive** feed with COM/NO.

```
                    +V (solenoid supply, e.g. 12 V)
                         │
                         │
                    ┌────┴────┐
                    │ Solenoid │
                    └────┬────┘
                         │
                         ├──► cathode of flyback diode
                         │         ▲
                         │         │  diode across coil
                         │         │  (stripe/cathode toward +V)
                         │         │
                         ├──► anode of flyback diode
                         │
                    Relay NO ──── Relay COM
                         │              │
                         │              └──► return to supply GND
                         │
                    (USB relay module — COM/NO only carry coil current)

  PC USB ──► Relay module USB port (control only)
```

### Terminal mapping (typical 1-channel LC board)

Labels vary by seller; look at the silkscreen:

| Terminal | Connect to |
|----------|------------|
| **COM** | One side of the switched path (e.g. supply return, or the feed you want to interrupt) |
| **NO** | The other side of that path (closed when software says ON) |
| **NC** | Leave unused for recoil (opens when ON) |

If your board has **+ / −** or **VCC / GND** screw terminals *in addition* to COM/NO, those are usually for an *external* relay coil supply on some variants — many USB LC modules do **not** need them. Follow the printing on *your* PCB.

### Flyback diode orientation

Inductive kick when the relay opens can arc contacts and upset USB. Wire the diode **in parallel with the solenoid**, reverse-biased in normal operation:

- **Cathode** (stripe) → solenoid terminal that connects toward **+V**
- **Anode** → solenoid terminal toward **GND / return**

---

## Mechanical mounting tips (recoil feel)

- Mount the solenoid so the plunger strikes a mass or plate that couples into the controller / vest harness — not into fragile plastic alone.
- Start with a soft pad on the impact face; increase pulse length before increasing supply voltage.
- Secure wires so vibration cannot yank the screw terminals.

---

## Software smoke test (before mounting)

1. Plug the USB relay in alone (no solenoid yet if you want). Windows should show a COM port (often “USB Serial Device”).
2. List ports:

```bash
cd modern-third-space
python -m modern_third_space.cli relay list
```

3. Pulse (replace `COM3` with your port):

```bash
python -m modern_third_space.cli relay pulse --port COM3 --ms 40
```

You should hear the relay click. Then wire the solenoid load and try again with a short pulse.

4. Or use the Electron app: start the daemon, open **Relay**, Connect, **Pulse Recoil**.

Daemon must be running for the UI:

```bash
python -m modern_third_space.cli daemon start
```

### Protocol reminder

Default 9600 8N1:

| Action | Bytes |
|--------|-------|
| ON | `A0 01 01 A2` |
| OFF | `A0 01 00 A1` |

Checksum = `(0xA0 + address + state) & 0xFF`. Default address `0x01`.

---

## Troubleshooting

| Symptom | Things to check |
|---------|-----------------|
| No COM port | Cable/data port; Device Manager; try another USB port |
| CLI “access denied” / open fails | Port in use by another app; close Serial Monitor; unplug/replug |
| Relay clicks, solenoid silent | Load supply off; COM/NO wiring; wrong voltage; fuse blown |
| Solenoid stuck ON | Software left it ON — send OFF / Disconnect; check pulse path |
| USB disconnects when firing | Missing flyback diode; coil current too high; ground loops — add diode, shorten pulse, separate supplies |
| Weak recoil | Slightly longer pulse (e.g. 40→80 ms); verify supply can hold voltage under load |

---

## What not to do

- Do not put mains AC on these tiny modules unless the product explicitly rates the contacts for it (most recoil builds should stay on low-voltage DC).
- Do not leave the relay ON for seconds while tuning — use **Pulse**.
- Do not share undersized jumper wire for multi-amp coils.

---

## Next steps after bench success

Once pulses feel right:

1. Note the best `duration_ms` for your solenoid + supply.
2. Later we can hook `relay_pulse` into game fire events (same daemon TCP path as vest triggers).

If your board’s terminal labels differ from COM/NO, photograph the silkscreen and adjust the table above for your unit.
