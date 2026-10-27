import * as React from 'react';
import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Preview,
	Section,
	Text
} from '@react-email/components';

interface Props {
	firstName?: string | null;
	siteUrl?: string;
	loginUrl?: string;
}

export default function RegistrationWelcome({
	firstName,
	siteUrl = 'https://blog.indexdaily.in',
	loginUrl
}: Props) {
	const greeting = firstName ? `Hi ${firstName},` : 'Hello,';
	const ctaUrl = loginUrl ?? siteUrl;

	return (
		<Html>
			<Head />
			<Preview>Your Open Tabs account is ready. Start reading.</Preview>
			<Body style={body}>
				<Container style={container}>
					<Section style={masthead}>
						<Text style={wordmark}>Open Tabs</Text>
						<Text style={tagline}>by IndexDaily Media</Text>
					</Section>

					<Hr style={divider} />

					<Section style={content}>
						<Heading style={heading}>Your account is ready.</Heading>
						<Text style={paragraph}>{greeting}</Text>
						<Text style={paragraph}>
							You&rsquo;ve joined Open Tabs &mdash; your home for sharp, context-first explainers on
							business, politics, and geopolitics.
						</Text>
						<Text style={paragraph}>
							Explore the latest stories, bookmark pieces to read later, and subscribe to the
							newsletter from your profile.
						</Text>
						<Button style={ctaButton} href={ctaUrl}>
							Start Reading
						</Button>
					</Section>

					<Hr style={divider} />

					<Section style={footer}>
						<Text style={footerText}>
							You received this email because an account was created at Open Tabs. If this
							wasn&rsquo;t you, you can safely ignore this message.
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

const ctaButton: React.CSSProperties = {
	display: 'inline-block',
	marginTop: '8px',
	padding: '12px 28px',
	backgroundColor: '#df8024',
	color: '#ffffff',
	borderRadius: '4px',
	fontSize: '14px',
	fontWeight: '600',
	textDecoration: 'none',
	letterSpacing: '0.01em'
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
