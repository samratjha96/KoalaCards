/**
 * This file serves as the main integration point for all AWS services.
 * It exports all AWS-based implementations and provides a way to update
 * existing files to use AWS services.
 */

import path from 'path';
import fs from 'fs/promises';

// Import and export all AWS services
export * from './aws-services';

// Export AWS implementations of existing files
export { openai, gptCall, createDallEPrompt, createDallEImage } from './openai-aws';
export { maybeGetCardImageUrl, maybeAddImageToCard } from './image-aws';
export { grammarCorrectionNext } from './grammar-aws';

// List of original files and their AWS replacements
const fileReplacements = [
  { original: 'openai.ts', replacement: 'openai-aws.ts' },
  { original: 'image.ts', replacement: 'image-aws.ts' },
  { original: 'grammar.ts', replacement: 'grammar-aws.ts' },
  { original: 'storage.ts', replacement: 'storage-s3.ts' },
  { original: 'generate-speech-url.ts', replacement: 'speech-polly.ts' },
  { original: 'transcribe.ts', replacement: 'transcribe-aws.ts' },
];

// Function to update imports in a file to use AWS implementations
export async function updateImportsToAWS(filePath: string): Promise<void> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    let updatedContent = content;
    
    // Replace imports from original files with imports from AWS replacements
    fileReplacements.forEach(({ original, replacement }) => {
      const originalImport = new RegExp(`from ['"]\\.\\.?\\/${path.parse(original).name}['"]`, 'g');
      const replacementImport = `from './${path.parse(replacement).name}'`;
      updatedContent = updatedContent.replace(originalImport, replacementImport);
      
      // Also handle deeper paths
      const deeperOriginalImport = new RegExp(`from ['"]\\.\\.?\\/\\.\\.?\\/\\.\\.?\\/${path.parse(original).name}['"]`, 'g');
      const deeperReplacementImport = `from '../../../${path.parse(replacement).name}'`;
      updatedContent = updatedContent.replace(deeperOriginalImport, deeperReplacementImport);
    });
    
    // Write the updated content back to the file
    await fs.writeFile(filePath, updatedContent, 'utf8');
    console.log(`Updated imports in ${filePath}`);
  } catch (error) {
    console.error(`Error updating imports in ${filePath}:`, error);
  }
}

// Function to update all files in a directory recursively
export async function updateAllImports(directoryPath: string): Promise<void> {
  try {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(directoryPath, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        // Recursively process directories
        await updateAllImports(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        // Process TypeScript files
        await updateImportsToAWS(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error updating imports in directory ${directoryPath}:`, error);
  }
}