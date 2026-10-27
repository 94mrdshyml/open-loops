import type { UserRole } from '$lib/types/index';
import type { Session } from '$lib/server/auth/index';

declare global {
	namespace App {
		interface Platform {
			env: Env & { CRON_SECRET?: string };
			ctx: ExecutionContext;
			caches: CacheStorage & { default: Cache };
			cf?: IncomingRequestCfProperties;
		}

		interface Locals {
			user: {
				id: string;
				email: string;
				name: string;
				firstName: string | null;
				lastName: string | null;
				username: string | null;
				role: UserRole;
				avatarUrl: string | null;
				emailVerified: boolean;
				createdAt: Date;
				isNewsletterSubscriber: boolean;
				resendContactId: string | null;
			} | null;
			session: Session | null;
		}
	}
}

export {};
