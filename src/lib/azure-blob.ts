/**
 * Azure Blob Storage utility for POS invoice PDFs
 * Uses Azure Storage connection string from environment variables
 */

import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_INVOICES_CONTAINER_NAME || "pos-invoices";

let containerClient: ContainerClient | null = null;

/**
 * Get or create the Azure Blob container client
 */
async function getContainerClient(): Promise<ContainerClient> {
    if (containerClient) {
        return containerClient;
    }

    if (!connectionString) {
        throw new Error("AZURE_STORAGE_CONNECTION_STRING environment variable is not set");
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    containerClient = blobServiceClient.getContainerClient(containerName);

    // Create container if it doesn't exist (with public blob access for invoices)
    const exists = await containerClient.exists();
    if (!exists) {
        await containerClient.create({ access: 'blob' }); // Public read access for blobs
        console.log(`Created Azure Blob container: ${containerName}`);
    }

    return containerClient;
}

/**
 * Upload invoice PDF to Azure Blob Storage
 * @returns Public URL of the uploaded PDF
 */
export async function uploadInvoicePDF(
    pdfBuffer: Buffer,
    organizationId: string,
    invoiceNumber: string
): Promise<string> {
    const container = await getContainerClient();

    // Generate unique blob name
    const timestamp = Date.now();
    const sanitizedInvoiceNumber = invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '_');
    const blobName = `${organizationId}/invoices/${sanitizedInvoiceNumber}-${timestamp}.pdf`;

    const blockBlobClient = container.getBlockBlobClient(blobName);

    await blockBlobClient.upload(pdfBuffer, pdfBuffer.length, {
        blobHTTPHeaders: {
            blobContentType: 'application/pdf',
            blobContentDisposition: `inline; filename="${invoiceNumber}.pdf"`,
        },
    });

    return blockBlobClient.url;
}

/**
 * Check if Azure Storage is configured
 */
export function isAzureStorageConfigured(): boolean {
    return !!connectionString;
}
