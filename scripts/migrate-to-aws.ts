/**
 * Script to migrate from OpenAI and Google Cloud to AWS services
 * 
 * This script:
 * 1. Updates package.json to add AWS dependencies and remove Google/OpenAI
 * 2. Creates AWS configuration files
 * 3. Creates AWS service implementations
 * 4. Updates imports in existing files to use AWS services
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { updateAllImports } from '../koala/aws-integration';

const execAsync = promisify(exec);

// Root directory of the project
const projectRoot = path.resolve(__dirname, '..');

// Function to run npm commands
async function runNpmCommand(command: string): Promise<void> {
  try {
    console.log(`Running: ${command}`);
    const { stdout, stderr } = await execAsync(command, { cwd: projectRoot });
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error) {
    console.error(`Error executing command: ${command}`, error);
    throw error;
  }
}

// Main migration function
async function migrateToAWS() {
  try {
    console.log('Starting migration to AWS services...');

    // 1. Remove Google Cloud and OpenAI dependencies and install AWS dependencies
    console.log('Updating dependencies...');
    await runNpmCommand('npm uninstall @google-cloud/language @google-cloud/storage @google-cloud/text-to-speech openai');
    await runNpmCommand('npm install @aws-sdk/client-s3 @aws-sdk/client-polly @aws-sdk/client-transcribe @aws-sdk/client-bedrock-runtime @aws-sdk/s3-request-presigner @aws-sdk/lib-storage');
    
    // 2. Update imports in all TypeScript files
    console.log('Updating imports in TypeScript files...');
    await updateAllImports(path.join(projectRoot, 'koala'));
    await updateAllImports(path.join(projectRoot, 'pages'));
    
    // 3. Run build to verify changes
    console.log('Running build to verify changes...');
    await runNpmCommand('npm run build');
    
    console.log('Migration to AWS services completed successfully!');
    console.log('Please update your environment variables with the AWS credentials.');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateToAWS().catch(console.error);