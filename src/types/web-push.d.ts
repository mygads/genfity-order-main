declare module 'web-push' {
    export interface VapidDetails {
        subject: string;
        publicKey: string;
        privateKey: string;
    }

    export interface PushSubscription {
        endpoint: string;
        keys: {
            p256dh: string;
            auth: string;
        };
    }

    export interface SendResult {
        statusCode: number;
        body: string;
        headers: Record<string, string>;
    }

    export interface WebPushError extends Error {
        statusCode?: number;
        body?: string;
    }

    export interface Options {
        gcmAPIKey?: string;
        vapidDetails?: VapidDetails;
        TTL?: number;
        headers?: Record<string, string>;
        contentEncoding?: 'aes128gcm' | 'aesgcm';
        proxy?: string;
        agent?: unknown;
        timeout?: number;
    }

    export function setGCMAPIKey(apiKey: string): void;
    
    export function setVapidDetails(
        subject: string,
        publicKey: string,
        privateKey: string
    ): void;

    export function generateVAPIDKeys(): {
        publicKey: string;
        privateKey: string;
    };

    export function sendNotification(
        subscription: PushSubscription,
        payload?: string | Buffer | null,
        options?: Options
    ): Promise<SendResult>;

    export function generateRequestDetails(
        subscription: PushSubscription,
        payload?: string | Buffer | null,
        options?: Options
    ): {
        method: string;
        headers: Record<string, string>;
        body: Buffer;
        endpoint: string;
    };

    const webpush: {
        setGCMAPIKey: typeof setGCMAPIKey;
        setVapidDetails: typeof setVapidDetails;
        generateVAPIDKeys: typeof generateVAPIDKeys;
        sendNotification: typeof sendNotification;
        generateRequestDetails: typeof generateRequestDetails;
    };

    export default webpush;
}
