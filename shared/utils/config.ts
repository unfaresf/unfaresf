// https://github.com/coollabsio/coolify/issues/1919#issuecomment-2026080171
function unescapeJsonString(
  possiblyEscapedJsonString: string
): Record<string, string> {
  let correctedString = possiblyEscapedJsonString;

  // Check and conditionally remove leading and trailing single quotes
  if (correctedString.startsWith("'") && correctedString.endsWith("'")) {
    correctedString = correctedString.slice(1, -1);
  }

  // Replace escaped double quotes with actual double quotes only if needed
  if (correctedString.includes('\\"')) {
    correctedString = correctedString.replace(/\\"/g, '"');
  }

  // Replace escaped newlines with actual newline characters only if needed
  if (correctedString.includes("\\\\n")) {
    correctedString = correctedString.replace(/\\\\n/g, "\\n");
  }

  // Attempt to parse the corrected string into a JSON object
  try {
    return JSON.parse(correctedString);
  } catch (error) {
    throw new Error(`Error un-escaping JSON string: ${error}`);
  }
}

export function getAgencyAltNames(): Record<string, string> {
  const {
    public: { agencyAltNames: agencyAltNamesString },
  } = useRuntimeConfig();

  try {
    return agencyAltNamesString ? unescapeJsonString(agencyAltNamesString) : {};
  } catch (err) {
    console.warn("Error parsing altAgencyNames env var", err);
    return {};
  }
}
