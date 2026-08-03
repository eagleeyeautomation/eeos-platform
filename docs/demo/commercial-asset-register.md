# Commercial asset register

Certification state: **Media package derived and validated; commercial-use music-license evidence pending**.

| Asset | Required evidence | Current state |
|---|---|---|
| Commercial master | `/Users/georg/EEOS Top com.mp4`; 62.729 seconds; H.264 High, 1920×1080, 23.98 fps; stereo AAC 48 kHz | SHA-256 `2cedcbdc16d587915ce1cdd92ee4a9a328a2320e38e655836829c290795b21c6` |
| Web derivative | `eeos-commercial-1080p-web.mp4`; H.264 High, 1920×1080, fast-start, original AAC mix stream-copied | SHA-256 `b080d85adf876a606c22609872faf243c1a906c4e6872f1caa149e4bba444625` |
| Poster | `eeos-commercial-poster.jpg`; approved final EEOS brand frame, 1920×1080 | SHA-256 `285a5434669b65ceca4a89f0903e9b402dd147134ddde64cd095aa8c5acabaaa` |
| Captions | `eeos-commercial.en.vtt`; English spoken narration, locally transcribed and corrected to approved wording | SHA-256 `965d4764b7e1aca5b897b76c2e21bbb6d84ae17c494781c8c550f5262f64e352` |
| Narration | Embedded in master; detected speech 00:00–00:54.200 matches the approved baseline through “EEOS. Fortune 500 Intelligence.” The repeated closing slogans are visual, not spoken. | Final embedded track; master unchanged |
| Music | Embedded continuously beneath narration and through the closing tail | License evidence pending from Eagle |
| Final mix | Stereo AAC 48 kHz, approximately 128 kbps; peak −1.34 dBFS, RMS −18.40 dBFS; no clipping detected | Treated as final embedded mix |

Do not deploy cinematic integration until the commercial-use music-license evidence is registered. Do not commit the master to Git; use approved asset storage and retain its immutable storage identifier.

Approved narration baseline is the exact Sprint 3 copy beginning “Every day, executives make hundreds of decisions” and ending “Stop Managing. Start Leading.”
