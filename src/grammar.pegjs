// ============================================================================
// BibTeX PEG Grammar for Peggy
// ============================================================================
//
// This grammar parses BibTeX files (.bib) as used by BibDesk and other
// reference managers. It produces an array of BibTeXEntry objects, one per
// bibliographic entry. Special blocks (@string, @preamble, @comment) and
// blank lines are parsed but filtered out of the final result.
//
// The parser runs inside a Web Worker for non-blocking UI performance.
// Compile with:  peggy --format es src/grammar.pegjs -o src/peggy.mjs
// ============================================================================

// ----------------------------------------------------------------------------
// Initializer block
// ----------------------------------------------------------------------------
// Code here runs once when the parser is instantiated. It declares shared
// state that is available to all rule actions during a single parse() call.
//
//   accentMap          – Maps LaTeX accent commands (e.g. "\\'e") to their
//                        Unicode equivalents (e.g. "é"). Used by the `special`
//                        rule when processing braced accent groups in author
//                        names such as {\\`a} → à.
//
//   multipleWhiteSpaces – Regex used to collapse runs of spaces to a single
//                        space before looking up an accent command in the map.
//
//   stringMacros       – Accumulates @string definitions encountered during
//                        parsing. Keys are lowercase macro names; values are
//                        the resolved replacement strings. The `strict_field`
//                        rule consults this dictionary to expand bare macro
//                        references in field values (e.g. organization = soipa).
// ----------------------------------------------------------------------------
{
  const accentMap = {
    '\\"A': 'Ä',
    '\\"a': 'ä',
    "\\'A": 'Á',
    "\\'a": 'á',
    '\\.A': 'Ȟ', 
    '\\.a': 'ȟ',
    '\\=A': 'Ā',
    '\\=a': 'ā',
    '\\^A': 'Â',
    '\\^a': 'â',
    '\\`A': 'À',
    '\\`a': 'à',
    '\\k A': 'Ą',
    '\\k a': 'ą',
    '\\r A': 'Å',
    '\\r a': 'å',
    '\\u A': 'Ă',
    '\\u a': 'ă',
    '\\v A': 'Ǎ',
    '\\v a': 'ǎ',
    '\\~A': 'Ã',
    '\\~a': 'ã',
    "\\'C": 'Ć',
    "\\'c": 'ć',
    '\\.C': 'Ċ',
    '\\.c': 'ċ',
    '\\^C': 'Ĉ',
    '\\^c': 'ĉ',
    '\\c C': 'Ç',
    '\\c c': 'ç',
    '\\v C': 'Č',
    '\\v c': 'č',
    '\\v D': 'Ď',
    '\\v d': 'ď',
    '\\"E': 'Ë',
    '\\"e': 'ë',
    "\\'E": 'É',
    "\\'e": 'é',
    '\\.E': 'Ė',
    '\\.e': 'ė',
    '\\=E': 'Ē',
    '\\=e': 'ē',
    '\\^E': 'Ê',
    '\\^e': 'ê',
    '\\`E': 'È',
    '\\`e': 'è',
    '\\c E': 'Ę',
    '\\c e': 'ę',
    '\\u E': 'Ĕ',
    '\\u e': 'ĕ',
    '\\v E': 'Ě',
    '\\v e': 'ě',
    '\\.G': 'Ġ',
    '\\.g': 'ġ',
    '\\^G': 'Ĝ',
    '\\^g': 'ĝ',
    '\\c G': 'Ģ',
    '\\c g': 'ģ',
    '\\u G': 'Ğ',
    '\\u g': 'ğ',
    '\\v G': 'Ǧ',
    '\\v g': 'ǧ',
    '\\^H': 'Ĥ',
    '\\^h': 'ĥ',
    '\\v H': 'Ȟ',
    '\\v h': 'ȟ',
    '\\"I': 'Ï',
    '\\"i': 'ï',
    "\\'I": 'Í',
    "\\'i": 'í',
    '\\.I': 'İ',
    '\\=I': 'Ī',
    '\\=i': 'ī',
    '\\^I': 'Î',
    '\\^i': 'î',
    '\\`I': 'Ì',
    '\\`i': 'ì',
    '\\k I': 'Į',
    '\\k i': 'į',
    '\\u I': 'Ĭ',
    '\\u i': 'ĭ',
    '\\v I': 'Ǐ',
    '\\v i': 'ǐ',
    '\\~I': 'Ĩ',
    '\\~i': 'ĩ',
    '\\^J': 'Ĵ',
    '\\^j': 'ĵ',
    '\\c K': 'Ķ',
    '\\c k': 'ķ',
    '\\v K': 'Ǩ',
    '\\v k': 'ǩ',
    "\\'L": 'Ĺ',
    "\\'l": 'ĺ',
    '\\c L': 'Ļ',
    '\\c l': 'ļ',
    '\\v L': 'Ľ',
    '\\v l': 'ľ',
    "\\'N": 'Ń',
    "\\'n": 'ń',
    '\\c N': 'Ņ',
    '\\c n': 'ņ',
    '\\v N': 'Ň',
    '\\v n': 'ň',
    '\\~N': 'Ñ',
    '\\~n': 'ñ',
    '\\"O': 'Ö',
    '\\"o': 'ö',
    "\\'O": 'Ó',
    "\\'o": 'ó',
    '\\.O': 'Ȯ',
    '\\.o': 'ȯ',
    '\\=O': 'Ō',
    '\\=o': 'ō',
    '\\^O': 'Ô',
    '\\^o': 'ô',
    '\\`O': 'Ò',
    '\\`o': 'ò',
    '\\H O': 'Ő',
    '\\H o': 'ő',
    '\\k O': 'Ǫ',
    '\\k o': 'ǫ',
    '\\u O': 'Ŏ',
    '\\u o': 'ŏ',
    '\\v O': 'Ǒ',
    '\\v o': 'ǒ',
    '\\~O': 'Õ',
    '\\~o': 'õ',
    "\\'R": 'Ŕ',
    "\\'r": 'ŕ',
    '\\c R': 'Ŗ',
    '\\c r': 'ŗ',
    '\\v R': 'Ř',
    '\\v r': 'ř',
    "\\'S": 'Ś',
    "\\'s": 'ś',
    '\\^S': 'Ŝ',
    '\\^s': 'ŝ',
    '\\c S': 'Ş',
    '\\c s': 'ş',
    '\\v S': 'Š',
    '\\v s': 'š',
    '\\c T': 'Ţ',
    '\\c t': 'ţ',
    '\\v T': 'Ť',
    '\\v t': 'ť',
    '\\"U': 'Ü',
    '\\"u': 'ü',
    "\\'U": 'Ú',
    "\\'u": 'ú',
    '\\=U': 'Ū',
    '\\=u': 'ū',
    '\\^U': 'Û',
    '\\^u': 'û',
    '\\`U': 'Ù',
    '\\`u': 'ù',
    '\\H U': 'Ű',
    '\\H u': 'ű',
    '\\k U': 'Ų',
    '\\k u': 'ų',
    '\\r U': 'Ů',
    '\\r u': 'ů',
    '\\u U': 'Ŭ',
    '\\u u': 'ŭ',
    '\\v U': 'Ǔ',
    '\\v u': 'ǔ',
    '\\~U': 'Ũ',
    '\\~u': 'ũ',
    '\\^W': 'Ŵ',
    '\\^w': 'ŵ',
    '\\"Y': 'Ÿ',
    '\\"y': 'ÿ',
    "\\'Y": 'Ý',
    "\\'y": 'ý',
    '\\=Y': 'Ȳ',
    '\\=y': 'ȳ',
    '\\^Y': 'Ŷ',
    '\\^y': 'ŷ',
    "\\'Z": 'Ź',
    "\\'z": 'ź',
    '\\.Z': 'Ż',
    '\\.z': 'ż',
    '\\v Z': 'Ž',
    '\\v z': 'ž',
    '\\aa': 'å',    // å
    '\\AA': 'Å',    // Å
    '\\ae': 'æ',    // æ
    '\\AE': 'Æ',    // Æ
    '\\DH': 'Ð',    // Ð
    '\\dh': 'ð',    // ð
    '\\dj': 'đ',    // đ
    '\\DJ': 'Đ',    // Đ
    '\\eth': 'ð',   // ð
    '\\ETH': 'Ð',   // Ð
    '\\i': 'ı',     // ı (dotless i)
    '\\l': 'ł',     // ł
    '\\L': 'Ł',     // Ł
    '\\ng': 'ŋ',    // ŋ
    '\\NG': 'Ŋ',    // Ŋ
    '\\O': 'Ø',     // Ø
    '\\o': 'ø',     // ø
    '\\oe': 'œ',    // œ
    '\\OE': 'Œ',    // Œ
    '\\ss': 'ß',    // ß
    '\\th': 'þ',    // þ
    '\\TH': 'Þ'     // Þ    
  };
  const multipleWhiteSpaces = / +/g;
  const stringMacros = {};
};

// ============================================================================
// Top-level rules
// ============================================================================

// main – Entry point. Matches zero or more blocks and filters out null values.
// Blocks that represent non-entry constructs (@string, @preamble, @comment,
// blank lines) return null and are discarded here, leaving only BibTeXEntry
// objects in the final output array.
main
  = blocks:block* { return blocks.filter((item) => item) }

// block – A single top-level construct in a .bib file. Tried in order:
//   1. bibentry       – A standard bibliographic entry (@article, @book, …)
//   2. string_block   – A @string macro definition
//   3. preamble_block – A @preamble declaration (ignored)
//   4. empty_lines    – One or more blank lines (ignored)
//   5. comment_line   – A %-prefixed line comment (ignored)
//   6. comment_block  – A @comment{…} block (ignored)
block
  = bibentry / string_block / preamble_block / empty_lines / comment_line / comment_block

// ============================================================================
// @string macro support
// ============================================================================

// string_block – Parses a BibTeX @string definition and stores the macro in
// the `stringMacros` dictionary for later expansion.
//
// Supported value forms:
//   @string{ name = {braced value} }
//   @string{ name = "quoted value" }
//   @string{ name = other_macro }       (resolves through stringMacros)
//
// The match is case-insensitive ("@string"i), consistent with BibTeX
// conventions. Macro names are stored in lowercase for case-insensitive
// lookup. Returns null so it is filtered out of the final entry array.
string_block
  = "@string"i empty_chars "{" empty_chars name:$[^= \t\n}]+ empty_chars "=" empty_chars value:string_value empty_chars "}" empty_chars {
    stringMacros[name.toLowerCase()] = value;
    return null;
  }

// string_value – The right-hand side of a @string definition. Tries, in order:
//   1. A braced value {…}   – returned as the inner content (via curly_brackets)
//   2. A quoted value "…"   – returned as the inner content (via quoted_string)
//   3. A bare identifier    – looked up in stringMacros to support chained
//                             definitions like @string{b = a} where a was
//                             previously defined; falls back to the raw text
//                             if no macro is found.
string_value
  = curly_brackets
  / quoted_string
  / v:$[^, }\t\n ]+ { return stringMacros[v.toLowerCase()] ?? v; }

// quoted_string – Matches a double-quoted string literal "…" and returns only
// the inner content (the @$ pluck strips the surrounding quotes).
quoted_string
  = "\"" @$[^"]* "\""

// ============================================================================
// @preamble support
// ============================================================================

// preamble_block – Matches @preamble{…} and discards it. BibTeX preambles
// contain raw LaTeX commands that are not relevant for citation data extraction.
// Without this rule, a @preamble in the input would cause a parse error.
preamble_block
  = "@preamble"i empty_chars curly_brackets empty_chars { return null; }

// ============================================================================
// Blank lines
// ============================================================================

// empty_lines – Matches one or more consecutive blank lines (lines containing
// only optional horizontal whitespace followed by a newline). Returns null
// so they are filtered out of the final result.
empty_lines
  = $(empty_line+) { return null; }

// ============================================================================
// Bibliographic entry
// ============================================================================

// bibentry – Parses a standard BibTeX entry of the form:
//
//   @TYPE{CITEKEY,
//     field1 = {value1},
//     field2 = value2,
//     ...
//   }
//
// The entry type (t) is captured as-is (case preserved). The citekey (c) is
// everything up to the first comma. Fields are parsed by the `fields` rule
// and collected into a key-value object. The "author" field receives special
// treatment: its value is a structured ParsedAuthor[] array (parsed by
// author_list), stored separately in the `authors` property rather than in
// the generic `fields` dictionary.
//
// Returns a BibTeXEntry: { citekey, type, authors, fields }
bibentry
  = "@" t:$([^ {]*) empty_chars "{" empty_chars c:$[^ ,]+ empty_chars "," empty_chars f:fields "}" empty_chars {
    let authors;
    const fields = f.reduce((acc, current) => {
        if(current[0]!=="author") {
          acc[current[0]] = current[1];
        } else {
          authors = current[1];
        };
        return acc;
      }, {})
    return {
      citekey:c,
      type:t,
      authors,
      fields
    }
  }

// ============================================================================
// Field parsing
// ============================================================================

// fields – A comma-separated list of field assignments, with an optional
// trailing comma. Uses Peggy's repetition-with-separator syntax (|.., sep|).
// Each element is a [key, value] tuple produced by one of the field rules.
fields
  = (@field|.., delimiter| delimiter?)

// field – A single key = value assignment inside an entry. Tried in order:
//   1. author_field   – Special handling for the "author" key (parses the
//                       structured author list)
//   2. generic_field  – Any non-author field with a braced value {…}
//   3. strict_field   – Fallback for bare/unbraced values (e.g. year = 1999)
//                       with @string macro resolution
field
  = author_field / generic_field / strict_field

// author_field – Matches the "author" key (case-insensitive) whose value must
// be a braced author list. The value is parsed into a structured
// ParsedAuthor[] array by the author_list rule. Returns ["author", authors].
author_field
  = f:(empty_chars @key:"author"i empty_chars "=" empty_chars @author_list:author_list empty_chars) { return [f[0].toLowerCase(), f[1]]; }

// strict_field – Fallback field rule for bare (unbraced) values such as
// numeric literals (year = 1999) or @string macro references
// (organization = soipa). The value is matched as a run of characters
// excluding commas and spaces.
//
// If the bare value matches a known @string macro name (case-insensitive
// lookup), the macro's expanded value is substituted. Otherwise the raw
// text is kept as-is. The field key is lowercased for consistency with
// generic_field.
//
// Returns [key, value] where value is the resolved string.
strict_field
  = f:(empty_chars @key:$[^= ]+ empty_chars "=" empty_chars @$[^, ]+ empty_chars) {
    const resolved = stringMacros[f[1].toLowerCase()];
    return [f[0].toLowerCase(), resolved !== undefined ? resolved : f[1]];
  }

// generic_field – Matches any field (except "author") whose value is enclosed
// in curly braces. The negative lookahead (!"author"i) prevents this rule
// from consuming author fields, which need special structured parsing.
// The value is extracted by curly_brackets (inner content, outer braces
// stripped). The field key is lowercased.
//
// Returns [key, value] where value is the brace-inner content string.
generic_field
  = f:(empty_chars @(!"author"i @key:$[^= ]+) empty_chars "=" empty_chars @value:curly_brackets empty_chars) { return [f[0].toLowerCase(), f[1]]; }

// delimiter – A comma surrounded by optional whitespace. Used as the
// separator between fields in the fields rule.
delimiter
  = empty_chars "," empty_chars

// ============================================================================
// Curly brace matching
// ============================================================================

// curly_brackets – Matches a balanced pair of curly braces and returns the
// inner content as a flat string. Handles:
//   - Escaped braces: \} and \{ are consumed literally without affecting
//     brace depth.
//   - Nested braces: Recursive calls to curly_brackets track depth correctly.
//   - Arbitrary content: Any character that is not an unescaped } is consumed.
//
// The outer braces are consumed but NOT included in the returned string
// (via the @ pluck operator). Inner nested braces ARE included in the
// captured text (because $() captures raw matched input).
//
// Example: "{Hello {World}}" → "Hello {World}"
curly_brackets
  = ("{" @$("\\}" / "\\{" / curly_brackets / (!"}" .))* "}")

// ============================================================================
// Author parsing
// ============================================================================
// BibTeX author fields have a structured format that requires dedicated
// parsing: authors are separated by " and " (case-insensitive), and each
// author is written as "LastName, FirstName" or just "FirstName LastName".

// author_list – The value of an author field, wrapped in braces.
// Strips the outer braces and delegates to the `authors` rule.
// Returns a ParsedAuthor[] array.
author_list
  = "{" @authors "}"

// authors – A list of individual authors separated by " and " (case-
// insensitive). Uses Peggy's repetition-with-separator syntax.
authors
  = author|.., author_sep|

// author_sep – The separator between authors: one or more spaces, the word
// "and" (case-insensitive), and one or more spaces. Matches " and ", " AND ",
// " And ", etc.
author_sep
  = " "+ "and"i " "+

// author – A single author name. Expects "LastName, FirstName" format
// (parsed via first_last_sep). If no comma is found (first is null), falls
// back to splitting on spaces: all tokens except the last become the first
// name, and the last token becomes the last name. This handles malformed
// entries like "John Smith" (no comma) gracefully.
//
// Returns { first: string, last: string }
author
  = last:author_last_name first:(first_last_sep @author_first_name)? {
    if(!first) {
      // This should not occur, but some bad bibentry misses the first name
      const name_parts = last.split(' ');
      if(name_parts.length>0) {
        // We check whether the name contains spaces and can be thus split
        first = name_parts.slice(0, -1).join(' ');
        last = name_parts[name_parts.length - 1];
      }
    }
    return {first, last};
  }

// author_last_name – Consumes characters forming the last name portion of an
// author. Stops at "}", " and " (author_sep), or "," (first_last_sep).
// Braced groups like {\`a} are processed through curly_brackets_special
// for accent resolution.
author_last_name
  = char:(curly_brackets_special / (!"}" !author_sep !first_last_sep @.))+ { return char.join(''); }

// author_first_name – Consumes characters forming the first name portion of
// an author (everything after the comma). Stops at "}" or " and "
// (author_sep). Like author_last_name, braced accent groups are resolved
// via curly_brackets_special.
author_first_name
  = char:(curly_brackets_special / (!"}" !author_sep @.))+ { return char.join(''); }

// ============================================================================
// LaTeX accent resolution
// ============================================================================

// curly_brackets_special – Matches a braced group {…} inside an author name
// and attempts to resolve it as a LaTeX accent command via the `special` rule.
// For example, {\\`a} is resolved to the Unicode character "à".
curly_brackets_special
  = "{" @special "}"

// special – Processes the content inside a braced group from an author name.
// Captures the raw text (which may contain nested braced groups), collapses
// multiple spaces to one, and looks up the result in accentMap. If found,
// returns the corresponding Unicode character; otherwise returns the raw text
// unchanged.
//
// Examples:
//   \\'e   → é    (found in accentMap)
//   \\v c  → č    (found in accentMap, after space normalization)
//   DNA    → DNA  (not in accentMap, returned as-is)
special
  = t:$(curly_brackets_special / (!"}" .))* {
  const accented = accentMap[t.replace(multipleWhiteSpaces,' ')];
  return accented ?? t;
}

// first_last_sep – The separator between last name and first name within a
// single author: a comma with optional surrounding spaces.
// Matches "," , " , " , " ," , ", " etc.
first_last_sep
  = " "* "," " "*
  
// ============================================================================
// Comment handling
// ============================================================================

// comment_line – A line comment starting with %. Matches optional leading
// horizontal whitespace, the % character, and the rest of the line (via
// loose_line). Returns null (filtered from output).
comment_line
  = $(_* "%" loose_line) { return null; }

// comment_block – A BibTeX @comment{…} block. Case-insensitive matching.
// Any text between "@comment" and the opening brace is consumed (some tools
// insert labels there). The braced content is matched via curly_brackets
// (supports nested braces). Returns null (filtered from output).
comment_block
  = "@comment"i $([^ {]*) empty_chars curly_brackets empty_chars newline? { return null; }

// ============================================================================
// Low-level / utility rules
// ============================================================================

// loose_line – Matches the remainder of a line (any characters up to and
// including the newline). Used internally by comment_line to consume the
// text after %. Returns null.
loose_line
  = t:$(([^\n]* newline) ) { return null; }

// not_newline – Matches one or more characters that are not a newline.
// Utility rule (currently unused directly but available for grammar
// extensions).
not_newline
  = [^\n]+

// newline – Matches a single newline character.
newline
  = [\n]

// empty_line – A line containing only optional horizontal whitespace (spaces
// or tabs) followed by a newline. Used by empty_lines to skip blank lines.
empty_line
  = $(_* [\n])

// empty_chars – Zero or more whitespace characters including spaces, newlines,
// and tabs. Used liberally throughout the grammar to skip insignificant
// whitespace between tokens.
empty_chars
  = $[ \n\t]*

// spacer – A comma surrounded by optional whitespace (spaces, newlines, tabs).
// Similar to delimiter but captured as a string. Currently unused but
// available for grammar extensions.
spacer
  = $(empty_chars "," empty_chars)

// _ – A single horizontal whitespace character: space or tab (no newlines).
// Used by rules like empty_line and comment_line that need to match only
// within a single line.
_ = [ \t]
