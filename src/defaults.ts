// defaults.ts

import {BibtexIntegrationSettings, AuthorFormatOptions, JournalReferenceOptions, HighlightType, FormatType} from 'types'

export const DEFAULT_SETTINGS: BibtexIntegrationSettings = {
    bibtex_filepath: '',
    import_delay_ms: 750,
    debug_parser: false,
    pdf_folder: '00 Meta/PDF++',
    use_demo_entries: true,
    organize_by_years: true,
    use_native_binary: false,
    suppress_resolver_nag: false,
}

export const AuthorOptionsDefault: AuthorFormatOptions = {
    onlyLastName: false,
    includeEtAl: true,
    precedeLastAuthorsByAnd: true,
    formatType: FormatType.AllAuthors,
}

export const JournalReferenceOptionDefault: JournalReferenceOptions = {
    includingYear: true,
    highlightVolume: HighlightType.None,
}

export const DEFAULT_BIBTEX_CONTENT = `
@article{Einstein:1935,
    author = {Einstein, A. and Podolsky, B. and Rosen, N.},
    doi = {10.1103/PhysRev.47.777},
    journal = {Phys. Rev.},
    month = {may},
    number = {10},
    pages = {777},
    title = {{Can Quantum-Mechanical Description of Physical Reality Be Considered Complete?}},
    volume = {47},
    year = {1935}}

@article{Watson:1953,
    Author = {Watson, J. D. and Crick, F. H. C.},
    Title = {{Molecular Structure of Nucleic Acids: A Structure for Deoxyribose Nucleic Acid}},
    Journal = {Nature},
    Year = {1953},
    Volume = {171},
    Number = {4356},
    Pages = {737},
    Month = {apr},
    Doi = {10.1038/171737a0},
}

@article{Franklin:1953,
    Author = {Franklin, Rosalind E. and Gosling, R. G.},
    Title = {{Evidence for 2-Chain Helix in Crystalline Structure of Sodium Deoxyribonucleate}},
    Journal = {Nature},
    Year = {1953},
    Volume = {172},
    Number = {4369},
    Pages = {156},
    Month = {jul},
    Doi = {10.1038/172156a0},
}
`;