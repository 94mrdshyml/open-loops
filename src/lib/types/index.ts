import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type {
	PostStatus,
	CommentStatus,
	authors,
	categories,
	comments,
	emailSends,
	postTags,
	posts,
	readHistory,
	settings,
	tags,
	user
} from '$lib/server/db/schema';

export type UserRole = 'reader' | 'author' | 'admin';

export type User = InferSelectModel<typeof user>;
export type NewUser = InferInsertModel<typeof user>;

export type Category = InferSelectModel<typeof categories>;
export type NewCategory = InferInsertModel<typeof categories>;

export type Tag = InferSelectModel<typeof tags>;
export type NewTag = InferInsertModel<typeof tags>;

export type Author = InferSelectModel<typeof authors>;
export type NewAuthor = InferInsertModel<typeof authors>;

export type Post = InferSelectModel<typeof posts>;
export type NewPost = InferInsertModel<typeof posts>;

export type PostTag = InferSelectModel<typeof postTags>;

export type Setting = InferSelectModel<typeof settings>;

export type EmailSend = InferSelectModel<typeof emailSends>;

export type ReadHistory = InferSelectModel<typeof readHistory>;
export type NewReadHistory = InferInsertModel<typeof readHistory>;

export type Comment = InferSelectModel<typeof comments>;
export type NewComment = InferInsertModel<typeof comments>;

export interface CommentWithUser {
	id: string;
	postSlug: string;
	body: string;
	status: CommentStatus;
	createdAt: Date;
	userName: string;
	userUsername: string | null;
	userAvatarUrl: string | null;
}

export interface CommentAdminView extends CommentWithUser {
	postTitle: string | null;
}

export interface UserComment {
	id: string;
	postSlug: string;
	postTitle: string | null;
	body: string;
	status: CommentStatus;
	createdAt: Date;
}

// ─── Query result types (shared between server queries and component props) ──

export interface PostAuthor {
	name: string;
	avatarUrl: string | null;
	slug: string | null;
	bio: string | null;
	role: string | null;
}

export interface PostCategory {
	name: string;
	slug: string;
	color: string | null;
}

export interface PostListItem {
	slug: string;
	title: string;
	subtitle: string | null;
	coverImageUrl: string | null;
	publishedAt: Date | null;
	readingTimeMinutes: number | null;
	category: PostCategory | null;
	author: PostAuthor | null;
}

export interface PostDetail extends PostListItem {
	id: string;
	categoryId: string | null;
	updatedAt: Date | null;
	content: string;
	excerpt: string | null;
	tldr: string[] | null;
	tags: { name: string; slug: string }[];
}

export interface CategoryWithCount {
	id: string;
	name: string;
	slug: string;
	color: string | null;
	/** One or two lines about the category, shown under its title. Empty means none. */
	description?: string | null;
	postCount: number;
	showOnHome: boolean;
	homeOrder: number;
}

export interface SiteSettings {
	site_name?: string;
	site_tagline?: string;
	meta_description?: string;
	og_image_url?: string;
	posts_per_page?: string;
	gtm_id?: string;
	ga4_id?: string;
	meta_pixel_id?: string;
	umami_website_id?: string;
	umami_share_url?: string;
	resend_api_key?: string;
	openrouter_api_key?: string;
	exa_api_key?: string;
	tldr_last?: string;
	indexnow_key?: string;
	indexnow_enabled?: string;
	indexnow_last?: string;
	resend_from_email?: string;
	resend_from_name?: string;
	ask_newsletter_on_register?: string;
	email_nl_subject?: string;
	email_nl_headline?: string;
	email_nl_body?: string;
	email_reg_subject?: string;
}

export interface TagWithCount extends Tag {
	postCount: number;
}

/** A tag and how many live stories carry it, as shown on the public tag cloud. */
export interface TagCount {
	name: string;
	slug: string;
	postCount: number;
}

export interface AuthorWithEmail extends Author {
	email: string | null;
}

export interface AdminPost {
	id: string;
	title: string;
	subtitle: string | null;
	slug: string;
	status: PostStatus;
	publishedAt: Date | null;
	updatedAt: Date;
	featuredImage: string | null;
	isFeatured: boolean;
	hasTldr: boolean;
	authorName: string | null;
	categoryName: string | null;
	categorySlug: string | null;
	categoryColor: string | null;
}

export interface AdminPostDetail {
	id: string;
	title: string;
	subtitle: string | null;
	slug: string;
	excerpt: string | null;
	tldr: string[] | null;
	content: string;
	featuredImage: string | null;
	isFeatured: boolean;
	status: PostStatus;
	publishedAt: Date | null;
	authorId: string;
	authorUserId: string | null;
	categoryId: string | null;
	readingTime: number | null;
	tags: Array<{ id: string; name: string; slug: string; createdAt: Date; updatedAt: Date }>;
}

export type { PostStatus, CommentStatus };
