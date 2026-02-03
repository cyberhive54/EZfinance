import { ParsedCSVRow } from "@/types/bulkImport";

export interface ParseResult {
  headers: string[];
  data: ParsedCSVRow[];
  error?: string;
}

/**
 * Parse CSV text and return headers and data rows
 * Handles both comma and semicolon delimiters
 */
export function parseCSV(csvText: string): ParseResult {
  try {
    if (!csvText.trim()) {
      return {
        headers: [],
        data: [],
        error: "CSV file is empty",
      };
    }

    // Detect delimiter (comma or semicolon)
    const firstLine = csvText.split("\n")[0];
    const delimiter = firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";

    const lines = csvText
      .trim()
      .split("\n")
      .filter((line) => line.trim());

    if (lines.length < 1) {
      return {
        headers: [],
        data: [],
        error: "CSV file has no data",
      };
    }

    // Parse headers
    const headers = lines[0]
      .split(delimiter)
      .map((h) => h.trim())
      .filter((h) => h.length > 0);

    if (headers.length === 0) {
      return {
        headers: [],
        data: [],
        error: "No headers found in CSV",
      };
    }

    // Parse data rows
    const data: ParsedCSVRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i]
        .split(delimiter)
        .map((v) => v.trim());

      if (values.length > 0 && values.some((v) => v.length > 0)) {
        const row: ParsedCSVRow = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || "";
        });
        data.push(row);
      }
    }

    // Validate row count
    if (data.length > 500) {
      return {
        headers,
        data: data.slice(0, 500),
        error: `CSV has ${data.length} rows, but maximum allowed is 500. Imported first 500 rows.`,
      };
    }

    return {
      headers,
      data,
    };
  } catch (error) {
    return {
      headers: [],
      data: [],
      error: `Failed to parse CSV: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Validate CSV file size and type
 */
export function validateCSVFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.name.endsWith(".csv") && file.type !== "text/csv" && file.type !== "application/vnd.ms-excel") {
    return {
      valid: false,
      error: "File must be a CSV file (.csv)",
    };
  }

  // Check file size (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum of 5MB`,
    };
  }

  return { valid: true };
}

/**
 * Read file as text
 */
export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text);
    };
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    reader.readAsText(file);
  });
}
