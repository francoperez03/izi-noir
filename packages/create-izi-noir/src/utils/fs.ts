import fs from 'fs-extra';
import path from 'path';

export async function ensureDir(dir: string): Promise<void> {
  await fs.ensureDir(dir);
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf-8');
}

export async function copyTemplate(
  templatePath: string,
  destPath: string,
  replacements: Record<string, string> = {}
): Promise<void> {
  let content = await fs.readFile(templatePath, 'utf-8');

  for (const [key, value] of Object.entries(replacements)) {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  await writeFile(destPath, content);
}

export async function directoryExists(dir: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dir);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export async function isDirectoryEmpty(dir: string): Promise<boolean> {
  try {
    const files = await fs.readdir(dir);
    return files.length === 0;
  } catch {
    return true;
  }
}
