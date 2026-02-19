use framework "Foundation"
use scripting additions

property scriptVersion : "1.0.4"

on resolveBookmarkFromBase64(base64String)
    -- Decode the Base64 string into NSData
    set bookmarkData to current application's NSData's alloc()'s initWithBase64EncodedString:base64String options:0

    -- Check if the bookmark data was successfully decoded
    if bookmarkData = missing value then
        return "Error: Failed to decode Base64 string."
    end if

    -- Set up variables to resolve the bookmark
    set {resolvedURL, missing value, |error|} to current application's NSURL's URLByResolvingBookmarkData:bookmarkData options:0 relativeToURL:(missing value) bookmarkDataIsStale:(reference) |error|:(reference)

    -- Check if there was an error during resolution
    if resolvedURL = missing value then
        return "Error: " & (|error|'s localizedDescription() as text)
    else
        -- Return the resolved file path as POSIX path
        return resolvedURL's |path|() as text
    end if
end resolveBookmarkFromBase64

on run argv
    if (count of argv) > 0 and item 1 of argv is "--version" then
        return scriptVersion
    end if
    set base64Bookmark to item 1 of argv
    return resolveBookmarkFromBase64(base64Bookmark)
end run
