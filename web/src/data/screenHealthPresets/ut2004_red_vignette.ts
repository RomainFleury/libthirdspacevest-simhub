import type { ScreenHealthPreset } from "../screenHealthPresets";

const preset: ScreenHealthPreset = {
    preset_id: "ut2004_red_vignette_v1",
    display_name: "Unreal Tournament 2004 — Red damage vignette (v1)",
    profile: {
        "schema_version": 0,
        "name": "UT2004",
        "capture": {
        "source": "monitor",
        "monitor_index": 1,
        "tick_ms": 100
        },
        "detectors": [
        {
            "type": "redness_rois",
            "cooldown_ms": 250,
            "threshold": {
            "min_score": 0.3
            },
            "rois": [
            {
                "name": "front-center",
                "direction": "front",
                "rect": {
                "x": 0.45,
                "y": 0,
                "w": 0.1,
                "h": 0.05
                }
            },
            {
                "name": "left",
                "direction": "left",
                "rect": {
                "x": 0,
                "y": 0.3,
                "w": 0.015,
                "h": 0.4
                }
            },
            {
                "name": "right",
                "direction": "right",
                "rect": {
                "x": 0.985,
                "y": 0.3,
                "w": 0.015,
                "h": 0.4
                }
            },
            {
                "name": "back",
                "direction": "back",
                "rect": {
                "x": 0.45,
                "y": 0.98,
                "w": 0.1,
                "h": 0.02
                }
            }
            ]
        }
        ]
    }
};

export default preset;