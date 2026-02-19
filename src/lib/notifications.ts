import { prisma } from './prisma'
import { MongoClient, ObjectId } from 'mongodb'

function logToFile(msg: string) {
    console.log(`[Notifications] ${msg}`);
}

interface CreateNotificationParams {
    organizationId: string
    userId: string
    title: string
    body?: string
    taskId?: string
    posAlertId?: string
    posOrderId?: string
    posInvoiceId?: string
}

/**
 * Utility to create a notification in the database
 */
export async function createNotification(params: CreateNotificationParams) {
    if (!params.userId || !params.organizationId) {
        logToFile(`ERROR: Missing mandatory IDs: User=${params.userId}, Org=${params.organizationId}`);
        return null;
    }

    logToFile(`createNotification starting for User: ${params.userId}`);
    try {
        // Try Prisma first
        if ((prisma as any).notification) {
            logToFile('Processing with Prisma relation syntax');
            try {
                const res = await (prisma as any).notification.create({
                    data: {
                        title: params.title,
                        body: params.body,
                        isRead: false,
                        // Use relation connect syntax which is more robust
                        organization: { connect: { id: params.organizationId } },
                        user: { connect: { id: params.userId } },
                        // Optional links
                        ...(params.taskId ? { task: { connect: { id: params.taskId } } } : {}),
                        // These are strings/ids in the schema but scalar fields
                        posAlertId: params.posAlertId,
                        posOrderId: params.posOrderId,
                        posInvoiceId: params.posInvoiceId,
                    },
                })
                logToFile(`Prisma success: ${res.id}`);
                return res;
            } catch (prismaErr: any) {
                logToFile(`Prisma failed: ${prismaErr.message}. Trying generic create...`);
                // Fallback to scalar fields if connect failed
                const res = await (prisma as any).notification.create({
                    data: {
                        organizationId: params.organizationId,
                        userId: params.userId,
                        title: params.title,
                        body: params.body,
                        posAlertId: params.posAlertId,
                        posOrderId: params.posOrderId,
                        posInvoiceId: params.posInvoiceId,
                    }
                });
                return res;
            }
        }

        // Fallback to native MongoDB
        logToFile('Prisma model missing, using MongoDB fallback');
        if (!process.env.DATABASE_URL) {
            logToFile('ERROR: DATABASE_URL missing');
            return null;
        }

        const client = new MongoClient(process.env.DATABASE_URL)
        await client.connect()
        try {
            const db = client.db()
            const collection = db.collection('Notification')

            const toId = (id?: string) => {
                if (!id) return null;
                try {
                    return new ObjectId(id);
                } catch (e) {
                    logToFile(`Warning: Invalid ID ${id}`);
                    return id;
                }
            }

            const doc: any = {
                organizationId: toId(params.organizationId),
                userId: toId(params.userId),
                title: params.title,
                body: params.body,
                isRead: false,
                createdAt: new Date(),
            };

            if (params.taskId) doc.taskId = toId(params.taskId);
            if (params.posAlertId) doc.posAlertId = toId(params.posAlertId);
            if (params.posOrderId) doc.posOrderId = toId(params.posOrderId);
            if (params.posInvoiceId) doc.posInvoiceId = toId(params.posInvoiceId);

            const result = await collection.insertOne(doc);
            logToFile(`MongoDB success: ${result.insertedId}`);
            return { id: result.insertedId.toString(), ...doc };
        } finally {
            await client.close()
        }
    } catch (error: any) {
        logToFile(`CRITICAL ERROR: ${error.message}\n${error.stack}`);
        return null;
    }
}
