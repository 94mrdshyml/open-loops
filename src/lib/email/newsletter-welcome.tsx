import * as React from 'react';
import {
	Body,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Link,
	Preview,
	Section,
	Text
} from '@react-email/components';

interface NewsletterWelcomeProps {
	firstName?: string | null;
	unsubscribeUrl?: string;
	headline?: string;
	bodyText?: string;
	siteUrl?: string;
}

export default function NewsletterWelcome({
	firstName,
	unsubscribeUrl = 'https://blog.indexdaily.in/unsubscribe',
	headline,
	bodyText,
	siteUrl = 'https://blog.indexdaily.in'
}: NewsletterWelcomeProps) {
	const greeting = firstName ? `Hi ${firstName},` : 'Hello,';
	const resolvedHeadline = headline ?? 'Welcome aboard.';

	return (
		<Html>
			<Head />
			<Preview>Welcome to Open Tabs — stories that matter, in your inbox.</Preview>
			<Body style={body}>
				<Container style={container}>
					<Section style={masthead}>
						<Text style={wordmark}>Open Tabs</Text>
						<Text style={tagline}>by IndexDaily Media</Text>
					</Section>

					<Hr style={divider} />

					<Section style={content}>
						<Heading style={heading}>{resolvedHeadline}</Heading>
						<Text style={paragraph}>{greeting}</Text>
						{bodyText ? (
							<Text style={paragraph}>{bodyText}</Text>
						) : (
							<>
								<Text style={paragraph}>
									You&rsquo;re now subscribed to Open Tabs &mdash; a newsletter for people who want
									to understand the business, politics, and geopolitics stories that drive the
									world.
								</Text>
								<Text style={paragraph}>Here&rsquo;s what to expect:</Text>
								<Text style={listItem}>&rarr; Sharp, context-first explainers</Text>
								<Text style={listItem}>&rarr; No noise, no hot takes &mdash; just the signal</Text>
								<Text style={listItem}>&rarr; Twice a week, in your inbox</Text>
							</>
						)}
						<Text style={paragraph}>
							Start reading the latest stories at{' '}
							<Link href={siteUrl} style={link}>
								{siteUrl.replace(/^https?:\/\//, '')}
							</Link>
							.
						</Text>
					</Section>

					<Hr style={divider} />

					<Section style={footer}>
						<Text style={footerText}>
							You received this email because you subscribed to Open Tabs. If this wasn&rsquo;t you,
							or you&rsquo;d like to stop receiving emails,{' '}
							<Link href={unsubscribeUrl} style={footerLink}>
								unsubscribe here
							</Link>
							.
						</Text>
						<Text style={footerText}>Open Tabs &middot; IndexDaily Media</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
}

const body: React.CSSProperties = {
	backgroundColor: '#f7f3ed',
	fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif"
};

const container: React.CSSProperties = {
	margin: '0 auto',
	padding: '20px 0 48px',
	maxWidth: '600px'
};

const masthead: React.CSSProperties = {
	padding: '36px 40px 24px'
};

const wordmark: React.CSSProperties = {
	fontSize: '22px',
	fontWeight: '700',
	color: '#1c1510',
	margin: '0 0 4px',
	fontStyle: 'italic',
	fontFamily: "'Playfair Display', Georgia, serif",
	letterSpacing: '-0.02em'
};

const tagline: React.CSSProperties = {
	fontSize: '11px',
	color: '#b0a599',
	margin: 0,
	textTransform: 'uppercase',
	letterSpacing: '0.1em'
};

const divider: React.CSSProperties = {
	borderColor: '#ddd5c8',
	borderTopWidth: '1px',
	margin: '0 40px'
};

const content: React.CSSProperties = {
	padding: '32px 40px'
};

const heading: React.CSSProperties = {
	fontSize: '30px',
	fontWeight: '700',
	color: '#1c1510',
	margin: '0 0 20px',
	fontFamily: "'Playfair Display', Georgia, serif",
	lineHeight: '1.2',
	letterSpacing: '-0.02em'
};

const paragraph: React.CSSProperties = {
	fontSize: '15px',
	lineHeight: '1.65',
	color: '#1c1510',
	margin: '0 0 16px'
};

const listItem: React.CSSProperties = {
	fontSize: '15px',
	lineHeight: '1.65',
	color: '#1c1510',
	margin: '0 0 8px',
	paddingLeft: '4px'
};

const link: React.CSSProperties = {
	color: '#df8024',
	textDecoration: 'underline'
};

const footer: React.CSSProperties = {
	padding: '20px 40px 0'
};

const footerText: React.CSSProperties = {
	fontSize: '12px',
	color: '#b0a599',
	margin: '0 0 6px',
	lineHeight: '1.5'
};

const footerLink: React.CSSProperties = {
	color: '#b0a599',
	textDecoration: 'underline'
};
