# Commercial asset register

Certification state: **Media package and commercial-use provenance validated; cleared for Sprint 3 integration and rehearsal**.

| Asset | Required evidence | Current state |
|---|---|---|
| Commercial master | `/Users/georg/EEOS Top com.mp4`; 62.729 seconds; H.264 High, 1920×1080, 23.98 fps; stereo AAC 48 kHz | SHA-256 `2cedcbdc16d587915ce1cdd92ee4a9a328a2320e38e655836829c290795b21c6` |
| Web derivative | `eeos-commercial-1080p-web.mp4`; H.264 High, 1920×1080, fast-start, original AAC mix stream-copied | SHA-256 `b080d85adf876a606c22609872faf243c1a906c4e6872f1caa149e4bba444625` |
| Poster | `eeos-commercial-poster.jpg`; approved final EEOS brand frame, 1920×1080 | SHA-256 `285a5434669b65ceca4a89f0903e9b402dd147134ddde64cd095aa8c5acabaaa` |
| Captions | `eeos-commercial.en.vtt`; English spoken narration, locally transcribed and corrected to approved wording | SHA-256 `965d4764b7e1aca5b897b76c2e21bbb6d84ae17c494781c8c550f5262f64e352` |
| Narration | Embedded in master; detected speech 00:00–00:54.200 matches the approved baseline through “EEOS. Fortune 500 Intelligence.” The repeated closing slogans are visual, not spoken. | Final embedded track; master unchanged |
| Music | “Eagle Eye Rising,” embedded continuously beneath narration and through the closing tail | Donna PRO commercial-use evidence verified |
| Final mix | Stereo AAC 48 kHz, approximately 128 kbps; peak −1.34 dBFS, RMS −18.40 dBFS; no clipping detected | Treated as final embedded mix |

Do not commit the master to Git; use approved asset storage and retain its immutable storage identifier.

Approved narration baseline is the exact Sprint 3 copy beginning “Every day, executives make hundreds of decisions” and ending “Stop Managing. Start Leading.”

## Provenance and license evidence

### Video

- Platform: Runway
- Asset type: AI-generated video
- Asset identifier: Not supplied
- Ownership/provenance: Original EEOS commercial created through Eagle's Runway workspace for EEOS
- Technical creation timestamp: July 31, 2026, 15:38:51 UTC (embedded master metadata)
- Account tier at creation: Not supplied
- Applicable platform terms reviewed: Runway Terms of Use, last updated May 11, 2026, state that Runway does not claim ownership of user outputs and does not restrict their commercial use, subject to compliance with the agreement: https://runwayml.com/terms-of-use
- Commercial-use status: Platform terms support commercial use; account record and asset identifier remain desirable provenance evidence
- Attribution: No attribution requirement identified for ordinary generated output. The separate “Powered by Runway” condition applies to customer applications using purchased Runway APIs, not use of a rendered output.

### Embedded music

- Platform: Donna — AI Song & Music Maker
- Asset type: Music track embedded in the approved commercial master
- Track title: Eagle Eye Rising
- Creator: George Brown
- Donna document number: `1253c992-e3d7-42fc-b493-aa2e9db5caa1`
- Date created: July 31, 2026
- Platform/region recorded by Donna: Android / US
- Account/library: Eagleeye1's Library
- Account tier: Donna PRO
- Proof of Creation: `/Users/georg/Downloads/eagle-eye-rising.pdf`; SHA-256 `c9f731906c377f02314a5d7701f8f6fd44ee7f6636a89f5d0ab2984d5aea3764`
- PRO library evidence: `/Users/georg/Downloads/Screenshot_20260803_115453.jpg`; SHA-256 `f56b48b2c0904a09089a9c5d14221b3d7e72e4ac9453f982e20ba9254834ef2f`
- Applicable platform terms reviewed: Donna Legal Terms section 29 grants active paid subscribers a perpetual, worldwide, royalty-free license for commercial and non-commercial use of their generated AI outputs. Free/trial outputs are restricted to personal, non-commercial use: https://www.musicdonna.com/terms
- License type: Perpetual, worldwide, royalty-free commercial-use license for a qualifying Donna PRO-generated output
- Attribution: Donna section 29 states no attribution requirement for qualifying generated AI outputs
- Evidence reconciliation: The Proof of Creation identifies the title, creator, creation date, platform, region, and document number. The Donna PRO screenshot shows the same title in Eagleeye1's My Songs library. Eagle supplied the provenance attestation that this track is the soundtrack embedded in the approved commercial master.
- Exact-track verification: Satisfied by the matching Donna creation certificate, Donna PRO library record, and Eagle provenance attestation. An original isolated Donna audio export was not required and was not used to alter the approved master.
- Deployment status: **Commercial-use documentation gate passed**
