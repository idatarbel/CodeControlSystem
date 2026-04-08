/**
 * Prompt builder — generates language-specific system and user prompts
 * for the Ollama API to produce well-commented code.
 */

const STYLE_INSTRUCTIONS = {
  jsdoc: `Use JSDoc conventions:
- File header: /** @file description */
- Functions: /** @param {type} name - desc */ /** @returns {type} desc */
- Classes: /** @class description */
- Complex logic: // inline comments`,

  tsdoc: `Use TSDoc conventions:
- File header: /** @file description */
- Functions: /** @param name - desc */ /** @returns desc */
- Classes: /** @class description */
- Interfaces: /** description of shape and usage */
- Complex logic: // inline comments`,

  pep257: `Use PEP 257 docstring conventions:
- Module docstring: """Module description.""" at top of file
- Classes: """Class description.""" immediately after class line
- Functions: """Function description.\\n\\nArgs:\\n    param: desc\\n\\nReturns:\\n    desc\\n\\nRaises:\\n    ExceptionType: desc"""
- Complex logic: # inline comments`,

  javadoc: `Use Javadoc conventions:
- File header: /** package/file description */
- Classes: /** class description */ with @author
- Methods: /** @param name desc */ /** @return desc */ /** @throws ExceptionType desc */
- Complex logic: // inline comments`,

  xmldoc: `Use C# XML documentation conventions:
- File header: /// <summary>description</summary>
- Classes: /// <summary>description</summary>
- Methods: /// <summary>desc</summary> /// <param name="x">desc</param> /// <returns>desc</returns>
- Complex logic: // inline comments`,

  doxygen: `Use Doxygen conventions:
- File header: /** @file filename \\n @brief description */
- Functions: /** @brief desc \\n @param name desc \\n @return desc */
- Structs/Classes: /** @brief description */
- Complex logic: /* inline comments */ or // inline comments`,

  godoc: `Use Go documentation conventions:
- Package comment: // Package name provides description (before package declaration)
- Functions: // FunctionName does X. (comment starts with function name)
- Types: // TypeName represents X.
- Complex logic: // inline comments
- Do NOT use @param or @return tags — Go convention is prose descriptions`,

  rustdoc: `Use Rust documentation conventions:
- Module header: //! Module description (inner doc comment)
- Functions: /// Description\\n/// \\n/// # Arguments\\n/// * \`param\` - desc\\n/// \\n/// # Returns\\n/// desc
- Structs: /// Description with # Examples section
- Complex logic: // inline comments`,

  swiftdoc: `Use Swift documentation markup:
- File header: /// File description
- Functions: /// Description\\n/// - Parameter name: desc\\n/// - Returns: desc\\n/// - Throws: desc
- Classes/Structs: /// Description
- Complex logic: // inline comments`,

  phpdoc: `Use PHPDoc conventions:
- File header: /** @file description */
- Classes: /** description */ with @package
- Functions: /** @param type $name desc */ /** @return type desc */ /** @throws ExceptionType desc */
- Complex logic: // inline comments`,

  yard: `Use YARD documentation conventions:
- File header: # frozen_string_literal: true then # description
- Classes: # Description
- Methods: # Description\\n# @param name [Type] desc\\n# @return [Type] desc
- Complex logic: # inline comments`,

  shell: `Use shell script documentation conventions:
- File header: #!/bin/bash then # block with description, usage, arguments
- Functions: # Description\\n# Arguments:\\n#   $1 - desc\\n# Returns:\\n#   desc
- Complex logic: # inline comments`,

  html: `Use HTML comment conventions:
- File header: <!-- File description, purpose, dependencies -->
- Section comments: <!-- Section: name -->
- Complex markup: <!-- explanation of structure -->`,

  css: `Use CSS comment conventions:
- File header: /* File description, purpose */
- Section headers: /* ===== Section Name ===== */
- Complex selectors: /* explanation */`,

  sql: `Use SQL comment conventions:
- File header: -- File description, purpose
- Table/View definitions: -- Description
- Complex queries: -- explanation of logic`,

  hash: `Use hash-comment conventions:
- File header: # File description, purpose
- Section headers: # --- Section ---
- Complex logic: # inline explanation`,

  semicolon: `Use semicolon-comment conventions:
- File header: ; File description
- Section headers: ; [SectionName]
- Values: ; explanation of setting`,

  powershell: `Use PowerShell comment-based help:
- File header: <# .SYNOPSIS desc .DESCRIPTION detailed desc #>
- Functions: <# .SYNOPSIS desc .PARAMETER name desc .OUTPUTS type .EXAMPLE usage #>
- Complex logic: # inline comments`,
};

function buildPrompt(fileContent, language, filePath, authorInfo) {
  const styleGuide = STYLE_INSTRUCTIONS[language.style] || STYLE_INSTRUCTIONS.hash;

  const authorBlock = authorInfo && authorInfo.author
    ? `
FILE HEADER METADATA (include in every file header):
- File: ${filePath}
- Author: ${authorInfo.author}
- Copyright: © ${authorInfo.company ? authorInfo.company + " " : ""}${authorInfo.year}
- Created: ${authorInfo.date}
- Last Modified: ${authorInfo.date}

Include this metadata in the file header comment using the appropriate comment style for the language. If a file header already exists with this metadata, update the "Last Modified" date only.`
    : "";

  const systemPrompt = `You are a senior software engineer adding documentation comments to a ${language.name} source file.

RULES:
1. Add comments where none exist: file headers, class/struct headers, function/method headers, and inline comments for complex logic.
2. Update existing comments that are stale or inaccurate relative to the current code.
3. Preserve existing comments that are still accurate, especially TODOs, FIXMEs, HACKs, and developer notes.
4. Follow the language's standard documentation conventions exactly.
5. Return ONLY the complete file content with comments added. No markdown fences, no explanations, no preamble.
6. Do NOT modify any code — only add or update comments.
7. Do NOT add trivial comments that restate the obvious (e.g., "// increment i" for i++).
8. Keep comments concise and informative.
${authorBlock}

${styleGuide}`;

  const userPrompt = `Add documentation comments to this ${language.name} file (${filePath}):

${fileContent}`;

  return { systemPrompt, userPrompt };
}

module.exports = { buildPrompt, STYLE_INSTRUCTIONS };
