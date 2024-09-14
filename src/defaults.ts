// defaults.ts

import {BibtexIntegrationSettings, AuthorOptions, JournalReferenceOptions, HighlightType} from 'types'

export const DEFAULT_SETTINGS: BibtexIntegrationSettings = {
    bibtex_filepath: '',
    import_delay_ms: 1000,
    debug_parser: false,
    widthRecentList: 1000,
    pdf_folder: '/',
    use_demo_entries: true,
    organize_by_years: true,
}

export const AuthorOptionsDefault: AuthorOptions = {
    shortList: false,
    onlyLastName: false,
}

export const JournalReferenceOptionDefault: JournalReferenceOptions = {
    includingYear: true,
    highlightVolume: HighlightType.None,
}

export const DEFAULT_BIBTEX_CONTENT = atob("QGFydGljbGV7RWluc3RlaW46MTkzNSwKICAgIGF1dGhvciA9IHtFaW5zdGVpbiwgQS4gYW5kIFBvZG9sc2t5LCBCLiBhbmQgUm9zZW4sIE4ufSwKICAgIGRvaSA9IHsxMC4xMTAzL1BoeXNSZXYuNDcuNzc3fSwKICAgIGpvdXJuYWwgPSB7UGh5cy4gUmV2Ln0sCiAgICBtb250aCA9IHttYXl9LAogICAgbnVtYmVyID0gezEwfSwKICAgIHBhZ2VzID0gezc3N30sCiAgICB0aXRsZSA9IHt7Q2FuIFF1YW50dW0tTWVjaGFuaWNhbCBEZXNjcmlwdGlvbiBvZiBQaHlzaWNhbCBSZWFsaXR5IEJlIENvbnNpZGVyZWQgQ29tcGxldGU/fX0sCiAgICB2b2x1bWUgPSB7NDd9LAogICAgeWVhciA9IHsxOTM1fX0KCkBhcnRpY2xle1dhdHNvbjoxOTUzLAogICAgQXV0aG9yID0ge1dhdHNvbiwgSi4gRC4gYW5kIENyaWNrLCBGLiBILiBDLn0sCiAgICBUaXRsZSA9IHt7TW9sZWN1bGFyIFN0cnVjdHVyZSBvZiBOdWNsZWljIEFjaWRzOiBBIFN0cnVjdHVyZSBmb3IgRGVveHlyaWJvc2UgTnVjbGVpYyBBY2lkfX0sCiAgICBKb3VybmFsID0ge05hdHVyZX0sCiAgICBZZWFyID0gezE5NTN9LAogICAgVm9sdW1lID0gezE3MX0sCiAgICBOdW1iZXIgPSB7NDM1Nn0sCiAgICBQYWdlcyA9IHs3Mzd9LAogICAgTW9udGggPSB7YXByfSwKICAgIERvaSA9IHsxMC4xMDM4LzE3MTczN2EwfSwKfQoKQGFydGljbGV7RnJhbmtsaW46MTk1MywKICAgIEF1dGhvciA9IHtGcmFua2xpbiwgUm9zYWxpbmQgRS4gYW5kIEdvc2xpbmcsIFIuIEcufSwKICAgIFRpdGxlID0ge3tFdmlkZW5jZSBmb3IgMi1DaGFpbiBIZWxpeCBpbiBDcnlzdGFsbGluZSBTdHJ1Y3R1cmUgb2YgU29kaXVtIERlb3h5cmlib251Y2xlYXRlfX0sCiAgICBKb3VybmFsID0ge05hdHVyZX0sCiAgICBZZWFyID0gezE5NTN9LAogICAgVm9sdW1lID0gezE3Mn0sCiAgICBOdW1iZXIgPSB7NDM2OX0sCiAgICBQYWdlcyA9IHsxNTZ9LAogICAgTW9udGggPSB7anVsfSwKICAgIERvaSA9IHsxMC4xMDM4LzE3MjE1NmEwfSwKfQo=");