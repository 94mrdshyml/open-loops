import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import * as schema from './schema';
import { generateId } from './generate-id';

type User = InferSelectModel<typeof schema.user>;

const DATABASE_URL = process.env.DATABASE_URL;
const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET;
const ORIGIN = process.env.ORIGIN ?? 'http://localhost:5173';

if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
if (!BETTER_AUTH_SECRET) throw new Error('BETTER_AUTH_SECRET is not set');

const client = neon(DATABASE_URL);
const db = drizzle(client, { schema });

const authForSeed = betterAuth({
	baseURL: ORIGIN,
	secret: BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: { enabled: true }
});

// ─── Tiptap JSON helpers ──────────────────────────────────────────

function doc(...content: object[]) {
	return JSON.stringify({ type: 'doc', content });
}
function h2(text: string) {
	return { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] };
}
function p(...texts: (string | object)[]) {
	return {
		type: 'paragraph',
		content: texts.map((t) => (typeof t === 'string' ? { type: 'text', text: t } : t))
	};
}
function bold(text: string) {
	return { type: 'text', marks: [{ type: 'bold' }], text };
}
function quote(text: string) {
	return { type: 'blockquote', content: [p(text)] };
}

// ─── Content ──────────────────────────────────────────────────────

const POSTS = [
	{
		slug: 'bengal-bjp-2026-ground-report',
		title: 'Bengal 2026: Why the BJP Needs More Than Modi to Win',
		subtitle:
			'Ground realities in West Bengal reveal an organisation problem no wave can paper over',
		excerpt:
			"The BJP's Bengal problem is structural, not electoral. A boots-on-ground look at what the party needs beyond brand Modi to crack India's most complex state.",
		isFeatured: true,
		categorySlug: 'politics',
		tagSlugs: ['west-bengal', 'bjp', 'elections', 'india'],
		publishedAt: new Date('2026-05-15T08:00:00Z'),
		readingTime: 7,
		content: doc(
			p(
				'In the summer of 2021, the BJP threw its best at West Bengal and came up short. Four years later, the same question haunts the party: can it build a winning organisation in a state where Mamata Banerjee has turned the Trinamool Congress into a near-total political machine?'
			),
			h2('The Arithmetic Problem'),
			p(
				"Bengal's 294 assembly seats are carved across communities that vote along lines of caste, religion, and geography in ways that resist simple national narratives. The BJP's 77-seat haul in 2021 was the party's best ever in the state — but it also revealed the ceiling. The party dominated in the north and in Jungle Mahal, won big among Matua and Rajbongshi communities, but was shut out of Kolkata's south and the Muslim-majority crescent across Murshidabad and Malda."
			),
			p(
				'That geography matters because Bengal seats are dense. A swing of three percentage points can flip 30 seats. The party that builds a capillary-level organisation — booth committees, local grievance cells, festival networks — wins. And that is precisely what the BJP has not yet managed outside its stronghold districts.'
			),
			h2('Money Angle: The Cost of Building Ground'),
			p(
				'Running a competitive state-level operation in Bengal costs money at a scale that national parties sometimes underestimate. District-level organisers estimate that a credible booth-level infrastructure in a single constituency costs ₹40–60 lakh per year to maintain — covering panchayat liaison, cultural events, and basic social support. Multiply that across 294 seats and you are looking at ₹1,200–1,750 crore over a five-year election cycle just in organisational overhead.'
			),
			p(
				"The Trinamool has a fundraising model built on the state's contractor and real estate network. The BJP, with corporate donations concentrated in Gujarat and Maharashtra, has to transfer resources eastward — a logistical and political problem. Sources in the Bengal unit say central funding for ground operations was cut after 2021, with the party choosing to conserve resources for UP and Gujarat cycles."
			),
			quote(
				'"You cannot parachute booth workers. You have to grow them over five years." — a BJP district secretary in Hooghly, speaking anonymously'
			),
			h2('The Organisational Gap'),
			p(
				'The Trinamool\'s "syndicate" model — panchayat-to-ward networks that deliver services and enforce loyalty simultaneously — is not just political; it is economic. Local leaders control access to construction jobs, MGNREGA rolls, and ration shops in many rural areas. Challenging this requires an alternative patronage network, something the BJP cannot build from Delhi.'
			),
			p(
				'The party has tried two models: importing organisers from UP and Bihar, and promoting local leaders. The imported model created resentment and defections. The local-leader model has produced factional infighting, most visibly in Cooch Behar and North 24 Parganas.'
			),
			h2('What Needs to Change'),
			p(
				"Analysts close to the BJP's Bengal operation point to three structural requirements: first, a credible chief ministerial face from Bengal itself — not an outsider; second, a de-hyphenation from Hindu nationalist rhetoric that alienates Brahmo, Christian, and liberal Hindu voters in Kolkata's south; third, a sustained investment in the party's student and youth wings, which are the natural feeder for booth-level workers."
			),
			p('None of these are quick fixes. The 2026 election is 18 months away. The clock is running.')
		)
	},
	{
		slug: 'nifty-correction-what-retail-investors-miss',
		title: 'Every Nifty Correction Looks the Same in the Middle',
		subtitle:
			'Historical data shows why retail investors exit at the worst time — and what to do instead',
		excerpt:
			'Pattern analysis of 12 major Nifty corrections since 2000 reveals a consistent behavioural trap. Here is what the data says.',
		isFeatured: false,
		categorySlug: 'business',
		tagSlugs: ['markets', 'nifty', 'investing', 'personal-finance'],
		publishedAt: new Date('2026-05-13T08:00:00Z'),
		readingTime: 6,
		content: doc(
			p(
				'Somewhere around the -14% mark on the Nifty, a predictable thing happens. Google Trends shows a spike in searches for "should I sell my mutual funds." SIP cancellations jump. Broking apps report their highest daily login numbers in months — mostly people logging in to check losses, not to buy.'
			),
			p(
				'This is not anecdote. It is a pattern visible in every major correction the Indian market has seen since 2000.'
			),
			h2('The Twelve Corrections'),
			p(
				'Since January 2000, the Nifty 50 has seen 12 corrections of 15% or more from peak to trough. The median correction lasted 198 days peak to trough and recovered to previous highs in a median of 287 days from the bottom. The fastest recovery was 58 days (post-COVID crash, 2020). The longest was 2,267 days (2008 financial crisis to 2013 recovery).'
			),
			p(
				"The COVID crash is the outlier that distorts retail memory. That correction was sharp and the recovery unprecedented. Most corrections are slower, messier, and require patience that doesn't feel like patience — it feels like watching money disappear."
			),
			h2('The Data on Retail Exit Timing'),
			p(
				'AMFI data on net equity mutual fund flows tells the story clearly. In the 2015–16 correction (Nifty fell 23%), monthly SIP registrations fell 18% from peak at exactly the point the index bottomed. In the 2018–19 correction (-16%), net equity outflows hit their highest monthly figure in the four weeks that included the absolute trough.'
			),
			quote(
				'Retail investors are systematic buyers on the way up and discretionary sellers on the way down — the worst possible combination.'
			),
			p(
				'This is not a character flaw. It is the entirely rational response to social proof (everyone around you is worried), loss aversion (losses feel twice as painful as equivalent gains feel good), and media coverage that intensifies at market bottoms.'
			),
			h2('What the Data Actually Recommends'),
			p(
				'Three observations from the historical record: One, ',
				bold(
					'corrections of -15 to -25% from peak have resolved to new highs in every case since 2000'
				),
				', though the timeline varied from 6 months to 4 years. Two, adding capital at -20% or more from peak has generated positive returns over any subsequent 3-year window without exception. Three, SIP continuation through corrections dramatically outperforms SIP cancellation + re-entry, because re-entry almost always happens after a significant portion of the recovery has already occurred.'
			),
			h2('The Real Risk Is Not the Correction'),
			p(
				'The risk retail investors face is not the correction itself — it is the behavioural response to the correction. A -20% market event that you sit through costs you nothing in realised terms and may accelerate your compounding if you add capital. A -20% event that triggers an exit locks in the loss and removes you from the recovery.'
			),
			p(
				"The hardest part of this advice is that it feels wrong at the moment you need it most. That is precisely why it works for those who follow it — most don't."
			)
		)
	},
	{
		slug: 'india-china-lac-2026-strategic-read',
		title: 'What the LAC Pullback Actually Bought India',
		subtitle:
			"Disengagement at Depsang and Demchok was a tactical reset, not a strategic win. Here's why the distinction matters.",
		excerpt:
			'The 2024 LAC disengagement was widely called a diplomatic win. A closer reading of the strategic math says otherwise.',
		isFeatured: false,
		categorySlug: 'geopolitics',
		tagSlugs: ['india-china', 'lac', 'border', 'geopolitics'],
		publishedAt: new Date('2026-05-11T08:00:00Z'),
		readingTime: 8,
		content: doc(
			p(
				'When Indian and Chinese troops completed disengagement at Depsang Plains and Demchok in late 2024, the coverage in Indian media was largely celebratory. "Galwan reversed," one headline declared. The Ministry of External Affairs called it a "positive development." The stock markets barely noticed.'
			),
			p(
				'Beneath the diplomatic language, the strategic picture is more complicated. What India achieved was a restoration of patrolling access to points it had not been able to reach since April 2020. What it did not achieve was a formal Chinese acknowledgement of where the Line of Actual Control runs — a distinction that will define the next confrontation.'
			),
			h2('What Disengagement Means and Does Not Mean'),
			p(
				'Disengagement at a friction point means both sides pull back troops and heavy equipment to agreed distances. It does not mean the underlying territorial dispute is resolved. It does not create new legal facts on the ground. And it does not prevent China from returning to the same positions during the next period of bilateral tension.'
			),
			p(
				'The pattern in Sino-Indian boundary management since 1962 has been: incursion → standoff → negotiated disengagement → quiet period → next incursion. Each cycle tends to establish a slightly different status quo. The question for analysts is whether the 2024 disengagement reset the clock to pre-2020 or locked in Chinese gains made between 2020 and 2024.'
			),
			h2('The Depsang Problem'),
			p(
				'Depsang Plains is strategically consequential because it provides direct access to the Karakoram Pass — India\'s northernmost claim point. Chinese occupation of the "bulge" area from 2020 onwards effectively blocked Indian patrols from reaching PP10, PP11, PP11A, PP12, and PP13.'
			),
			p(
				'The 2024 agreement restored patrolling access to these points. But restoration of patrol access is not the same as restoration of physical presence. India can now send patrols — but those patrols move through an area where Chinese infrastructure built between 2020 and 2024 remains. Roads, helipads, and forward logistics nodes on the Chinese side of the perceived LAC are permanent until they are not.'
			),
			quote(
				'"We got back the right to walk to our patrol points. China kept the roads." — retired Lt Gen with Ladakh Corps experience, speaking privately'
			),
			h2('The Economic Context China Is Watching'),
			p(
				"India's border management is not separable from its economic relationship with China. Bilateral trade in 2024–25 was approximately $118 billion, with India running a deficit of around $85 billion. Indian manufacturers, particularly in electronics and specialty chemicals, remain deeply dependent on Chinese inputs. This economic interdependence constrains India's options in ways that pure strategic analysis ignores."
			),
			p(
				'China\'s calculation appears to include this dependency. The pattern of "probe, escalate, negotiate, collect" that characterises Chinese border behaviour in Ladakh, Arunachal, and Bhutan is consistent with a strategy of extracting incremental gains without triggering the kind of economic decoupling that would genuinely threaten Chinese interests.'
			),
			h2('What India Needs to Do Differently'),
			p(
				'Three requirements emerge from this analysis: One, India needs to establish and publicise its own detailed LAC maps — something it has historically resisted for domestic political reasons. Two, the infrastructure programme in Ladakh needs to accelerate to the point where Indian forward positioning is self-sustaining, not dependent on logistics chains that run through contested territory. Three, the economic dependency on China in critical sectors needs a 5-year reduction plan with teeth — not the aspirational import substitution announcements that have not moved the needle.'
			),
			p(
				'None of this is comfortable to say after a diplomatic moment the government has invested in presenting as a success. But strategy runs on decades, not news cycles.'
			)
		)
	},
	{
		slug: 'india-startup-funding-2026-what-changed',
		title: 'Funding Winter Is Over. The Ecosystem Is Not the Same.',
		subtitle:
			"Indian startups raised more in Q1 2026 than any quarter since 2021. That's good news with a catch.",
		excerpt:
			"Capital is flowing back into Indian startups. But the terms, sectors, and founders getting funded look very different from the 2021 boom. Here's what shifted.",
		isFeatured: false,
		categorySlug: 'business',
		tagSlugs: ['startups', 'venture-capital', 'india', 'technology'],
		publishedAt: new Date('2026-05-09T08:00:00Z'),
		readingTime: 6,
		content: doc(
			p(
				'Indian startups raised $4.2 billion in Q1 2026, the highest quarterly figure since Q3 2021, according to data compiled by Tracxn. The headlines called it the end of the funding winter. The data says something more nuanced: capital is back, but it is behaving differently.'
			),
			h2('Where the Money Is Going'),
			p(
				'Three sectors account for 68% of Q1 2026 funding: AI/ML infrastructure and tooling (31%), fintech (22%), and B2B SaaS (15%). Consumer internet — the darling of the 2021 boom — captured less than 8%, down from over 40% at the peak. Quick commerce, edtech, and social commerce, which collectively raised billions between 2020 and 2022, are largely absent from the 2026 funding landscape.'
			),
			p(
				'This is not a rotation within the same ecosystem. It is a fundamental change in what investors believe can generate returns at Indian scale.'
			),
			h2('The Unit Economics Shift'),
			p(
				'The 2021 funding environment rewarded growth-at-any-cost. The metric that mattered was GMV or user growth — downstream questions about contribution margin and path to profitability were deferred. The 2023–24 correction forced a brutal reckoning: dozens of startups cut headcount, several unicorns saw dramatic valuation write-downs, and a handful — most visibly in edtech — effectively failed despite paper valuations in the billions.'
			),
			p(
				'Investors who survived that period are now funding on different terms. Standard term sheets in Q1 2026 include ratchet provisions tied to revenue milestones, board seats from Series A (previously Series B), and preference liquidation structures that protect downside more aggressively than 2021-era deals.'
			),
			quote(
				"We are doing more diligence on unit economics in seed rounds now than we were doing at Series B in 2021. The market trained us.' — a partner at a Mumbai-based early-stage fund"
			),
			h2('Who Is Getting Funded'),
			p(
				'The founder profile has also shifted. Analysis of Q1 2026 deals shows 64% of funded founders have prior operating experience at a scaled company — compared to 41% in 2021. Second-time founders are raising faster and at higher valuations relative to first-timers than at any point in the past decade. And IIT/IIM pedigree, while still correlated with funding access, has weakened as a signal relative to revenue traction.'
			),
			h2('The Tiger Global Problem'),
			p(
				'The 2021 ecosystem was partly an artefact of global capital searching for yield in a low-interest environment. Tiger Global, SoftBank, and a cohort of crossover funds deployed capital into Indian startups at velocity and valuations that domestic VCs could not match. When those funds retrenched — Tiger most dramatically — the valuation floor collapsed.'
			),
			p(
				'Q1 2026 funding is more domestic and more patient. The top five investors by deal count are all India-based or India-focused funds. This is structurally healthier. It is also a different ecosystem — more selective, slower-moving, and with a shorter tail of marginal bets.'
			),
			p(
				"The funding winter is over. The ecosystem it shaped rewards different things. Founders who adapted will find 2026 receptive. Those still optimising for the 2021 playbook won't."
			)
		)
	},
	{
		slug: 'us-tariff-india-opportunity-cost',
		title: 'The US Tariff War Has an India Angle Everyone Is Missing',
		subtitle:
			'While analysts debate the US-China trade decoupling, Indian exporters are quietly benefiting — but not in the sectors that matter most',
		excerpt:
			'US tariffs on Chinese goods have created export openings for India. Why India is capturing only a fraction of the opportunity, and what it would take to capture more.',
		isFeatured: false,
		categorySlug: 'geopolitics',
		tagSlugs: ['us-india', 'trade', 'tariffs', 'geopolitics', 'china'],
		publishedAt: new Date('2026-05-07T08:00:00Z'),
		readingTime: 7,
		content: doc(
			p(
				"Every time the United States raises tariffs on Chinese goods, there is a recurring argument in Indian policy circles: this is India's moment. American buyers need to diversify their supply chains. India has labour, scale, and English-speaking engineering talent. The conditions for a manufacturing boom are finally aligned."
			),
			p(
				"This argument has been made, in various forms, since the first Trump tariff round in 2018. Eight years later, India's share of US goods imports has grown from 2.1% to 2.9%. Vietnam's share has grown from 2.2% to 4.8%. Bangladesh's garment exports to the US have nearly doubled. India captured some of the opportunity. It left much more on the table."
			),
			h2('What India Actually Won'),
			p(
				"Indian exporters have gained measurably in specific categories: pharmaceuticals (where India already had dominant market share), gems and jewellery, and select engineering goods. IT services exports, while not directly affected by goods tariffs, have benefited from US companies' preference for India as a technology services hub amid broader China risk reduction."
			),
			p(
				'These are real gains. India-US bilateral goods trade crossed $120 billion in 2025. But the opportunity in labour-intensive manufacturing — electronics assembly, apparel, furniture, toys — has largely gone to Vietnam, Bangladesh, Mexico, and increasingly Indonesia.'
			),
			h2('Why India Is Not Capturing More'),
			p(
				"Three structural constraints explain the gap. First, India's logistics infrastructure remains a significant cost disadvantage. Average dwell time at major Indian ports is 3–4 days versus 1.5–2 days at comparable Vietnamese and Chinese ports. For just-in-time manufacturing, this is disqualifying. Second, land acquisition for greenfield industrial zones takes 4–7 years in India on average, versus 6–18 months in competing jurisdictions. Third, India's labour laws, while reformed at the margin, still impose flexibility costs that large-scale assembly operations cannot absorb."
			),
			quote(
				'"We want to be in India. But we cannot build a factory there in the timeframe the market requires." — procurement lead at a US consumer electronics company, at a Delhi trade event'
			),
			h2('The PLI Scorecard'),
			p(
				"India's Production Linked Incentive scheme was designed to address exactly this problem. The results are mixed. In smartphones, PLI has been a genuine success: Apple's contract manufacturers have built significant capacity in India, and India's mobile phone exports crossed $15 billion in 2024–25. In other sectors — furniture, apparel, toys — PLI uptake has been below target."
			),
			p(
				"The difference appears to be in the ease of setting up operations. Apple suppliers benefit from a single-window facilitation model in Tamil Nadu and Karnataka that other sectors have not received. The lesson — that execution at state level matters as much as policy at national level — is one India's system has been slow to internalise."
			),
			h2('The Window Is Not Indefinite'),
			p(
				'Supply chain diversification decisions made between 2025 and 2028 will largely define the global manufacturing map for the following decade. Capacity built in Vietnam or Indonesia is not easily relocated. India is competing for a share of decisions being made right now.'
			),
			p(
				"The opportunity is real. The question is whether India's political economy — across Centre, states, and bureaucracy — can move fast enough to capture it before the window closes."
			)
		)
	},
	{
		slug: 'lok-sabha-2024-results-one-year-later',
		title: 'One Year After Lok Sabha 2024: What the Result Actually Meant',
		subtitle:
			'The BJP won a third term but lost its majority. Twelve months on, how has that arithmetic changed Indian politics?',
		excerpt:
			'The 2024 general election produced a hung coalition rather than a dominant majority. A year on, the downstream effects are playing out across policy, politics, and the opposition.',
		isFeatured: false,
		categorySlug: 'politics',
		tagSlugs: ['lok-sabha', 'elections', 'bjp', 'india', 'nda'],
		publishedAt: new Date('2026-05-05T08:00:00Z'),
		readingTime: 7,
		content: doc(
			p(
				'On June 4, 2024, the BJP won 240 seats — enough for a third consecutive term in government with NDA coalition partners, but 32 short of the 272 needed for a parliamentary majority on its own. After a decade of BJP dominance defined by comfortable majorities and a weakened opposition, Indian politics had a new variable: coalition arithmetic.'
			),
			p(
				"Twelve months later, it is worth asking what actually changed, and what the result's long-term implications are for the party, the opposition, and Indian democracy."
			),
			h2('What Got Harder for the Government'),
			p(
				'Coalition dependence has created friction in two areas. First, legislation: the government has moved more carefully on bills that touch on issues sensitive to alliance partners — particularly anything related to reservations, federalism, or state-level resource allocation. The uniform civil code, a flagship BJP commitment, has been quietly deferred.'
			),
			p(
				"Second, economic decisions: NITI Aayog's discussions on the fifteenth Finance Commission formula have been more contentious than previous cycles, with Telugu Desam Party and JD(U) — both key coalition partners — pushing hard for higher devolution to their states. The government has had to give more ground than it would have under a majority."
			),
			h2('What Did Not Change'),
			p(
				"The foreign policy and national security posture has been largely continuous. Coalition partners have no meaningful dissent on India-China border management, India-US relations, or the government's handling of Pakistan. The BJP's dominance of the national security narrative — built since 2014 — is not threatened by coalition arithmetic."
			),
			p(
				"Similarly, the broad macroeconomic framework — fiscal consolidation, capital expenditure emphasis, PLI-led manufacturing push — has continued without significant modification. The government's economic managers have used the coalition constraint as political cover for deferred welfare spending commitments rather than as a genuine constraint."
			),
			h2("The Opposition's Problem"),
			p(
				"The INDIA alliance that held together through the 2024 election has struggled to function as a coherent opposition bloc. Seat-sharing arrangements that served the election are not built for the sustained coordination that parliamentary opposition requires. The alliance's constituent parties — Congress, SP, TMC, DMK, AAP — have divergent state-level interests that make joint parliamentary strategy difficult."
			),
			p(
				"Congress has marginally improved its organisational capacity under Rahul Gandhi's more assertive leadership, but remains electorally weak in the Hindi belt states that determine national outcomes. The party's vote share recovery in 2024 came disproportionately from seats where it already had strong local candidates — not from a generalised recovery of the Congress brand."
			),
			quote(
				'"We won more seats but not more states. The structural problem is the same." — a senior Congress strategist, speaking at an off-record dinner in Delhi'
			),
			h2('Looking Ahead to 2029'),
			p(
				'The BJP faces the 2029 election from a position of incumbency and coalition management. The party needs either to rebuild its coalition to a point where NDA can reach 272 without depending on TDP and JD(U), or to institutionalise coalition governance in ways that do not cost it its core identity.'
			),
			p(
				'Both are hard. The 2024 result did not herald a new political era — but it did insert uncertainty into a system that had seemed, for a decade, to be trending toward single-party dominance. That uncertainty is valuable for democracy, uncomfortable for governance, and the defining variable in Indian politics for the next five years.'
			)
		)
	}
];

const CATEGORIES = [
	{
		slug: 'business',
		name: 'Business',
		color: '#2563EB',
		description: 'Markets, companies, and economic trends'
	},
	{
		slug: 'politics',
		name: 'Politics',
		color: '#7C3AED',
		description: 'Indian and global political developments'
	},
	{
		slug: 'geopolitics',
		name: 'Geopolitics',
		color: '#059669',
		description: 'International relations, trade, and strategic affairs'
	},
	{
		slug: 'technology',
		name: 'Technology',
		color: '#D97706',
		description: 'Tech industry, policy, and emerging platforms'
	}
];

const TAGS = [
	{ slug: 'india', name: 'India' },
	{ slug: 'bjp', name: 'BJP' },
	{ slug: 'elections', name: 'Elections' },
	{ slug: 'west-bengal', name: 'West Bengal' },
	{ slug: 'markets', name: 'Markets' },
	{ slug: 'nifty', name: 'Nifty' },
	{ slug: 'investing', name: 'Investing' },
	{ slug: 'personal-finance', name: 'Personal Finance' },
	{ slug: 'india-china', name: 'India-China' },
	{ slug: 'lac', name: 'LAC' },
	{ slug: 'border', name: 'Border' },
	{ slug: 'geopolitics', name: 'Geopolitics' },
	{ slug: 'startups', name: 'Startups' },
	{ slug: 'venture-capital', name: 'Venture Capital' },
	{ slug: 'technology', name: 'Technology' },
	{ slug: 'us-india', name: 'US-India' },
	{ slug: 'trade', name: 'Trade' },
	{ slug: 'tariffs', name: 'Tariffs' },
	{ slug: 'china', name: 'China' },
	{ slug: 'lok-sabha', name: 'Lok Sabha' },
	{ slug: 'nda', name: 'NDA' },
	{ slug: 'politics', name: 'Politics' },
	{ slug: 'economy', name: 'Economy' }
];

const AUTHOR_SLUG = 'mridushyamal-bose';

async function seed() {
	console.log('Seeding database…');

	// ── Admin user ────────────────────────────────────────────────
	const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'mridushyamal@indexdaily.in';
	const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'changeme_set_this_in_env';
	const ADMIN_NAME = 'Mridushyamal Bose';

	let adminUser: User | undefined;

	try {
		const result = await authForSeed.api.signUpEmail({
			body: { name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
		});
		adminUser = result.user as User;
		console.log(`✓ Created admin user: ${ADMIN_EMAIL}`);
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : String(e);
		if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists')) {
			console.log(`✓ Admin user already exists: ${ADMIN_EMAIL}`);
			const [existing] = await db
				.select()
				.from(schema.user)
				.where(eq(schema.user.email, ADMIN_EMAIL))
				.limit(1);
			adminUser = existing;
		} else {
			throw e;
		}
	}

	if (!adminUser) throw new Error('Could not create or find admin user');

	// ── Set admin user extended fields ────────────────────────────
	await db
		.update(schema.user)
		.set({ role: 'admin', firstName: 'Mridushyamal', lastName: 'Bose', username: 'mridushyamal' })
		.where(eq(schema.user.id, adminUser.id));
	console.log('✓ Admin user extended fields set');

	// ── Author ────────────────────────────────────────────────────
	const [authorRow] = await db
		.insert(schema.authors)
		.values({
			id: generateId('aut'),
			userId: adminUser.id,
			displayName: 'Mridushyamal Bose',
			slug: AUTHOR_SLUG,
			bio: 'Editor, Open Tabs. Covers business, politics, and geopolitics for IndexDaily Media.',
			avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=Mridushyamal+Bose&backgroundColor=1a1a18&fontFamily=Georgia&fontWeight=600`
		})
		.onConflictDoUpdate({
			target: schema.authors.slug,
			set: {
				displayName: 'Mridushyamal Bose',
				bio: 'Editor, Open Tabs. Covers business, politics, and geopolitics for IndexDaily Media.',
				avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=Mridushyamal+Bose&backgroundColor=1a1a18&fontFamily=Georgia&fontWeight=600`
			}
		})
		.returning({ id: schema.authors.id });
	const AUTHOR_ID = authorRow.id;
	console.log('✓ Author profile');

	// ── Categories ────────────────────────────────────────────────
	const categoryIdMap = new Map<string, string>();
	for (const cat of CATEGORIES) {
		const [row] = await db
			.insert(schema.categories)
			.values({
				id: generateId('cat'),
				name: cat.name,
				slug: cat.slug,
				color: cat.color,
				description: cat.description
			})
			.onConflictDoUpdate({
				target: schema.categories.slug,
				set: { name: cat.name, color: cat.color, description: cat.description }
			})
			.returning({ id: schema.categories.id });
		categoryIdMap.set(cat.slug, row.id);
	}
	console.log(`✓ ${CATEGORIES.length} categories`);

	// ── Tags ──────────────────────────────────────────────────────
	const tagIdMap = new Map<string, string>();
	for (const tag of TAGS) {
		const [row] = await db
			.insert(schema.tags)
			.values({ id: generateId('tag'), name: tag.name, slug: tag.slug })
			.onConflictDoUpdate({
				target: schema.tags.slug,
				set: { name: tag.name }
			})
			.returning({ id: schema.tags.id });
		tagIdMap.set(tag.slug, row.id);
	}
	console.log(`✓ ${TAGS.length} tags`);

	// ── Posts ─────────────────────────────────────────────────────
	for (const post of POSTS) {
		const categoryId = categoryIdMap.get(post.categorySlug);
		if (!categoryId) throw new Error(`Category not found: ${post.categorySlug}`);

		const [postRow] = await db
			.insert(schema.posts)
			.values({
				id: generateId('pst'),
				slug: post.slug,
				title: post.title,
				subtitle: post.subtitle,
				excerpt: post.excerpt,
				content: post.content,
				isFeatured: post.isFeatured,
				status: 'published',
				publishedAt: post.publishedAt,
				authorId: AUTHOR_ID,
				categoryId,
				readingTime: post.readingTime
			})
			.onConflictDoUpdate({
				target: schema.posts.slug,
				set: {
					title: post.title,
					subtitle: post.subtitle,
					excerpt: post.excerpt,
					content: post.content,
					isFeatured: post.isFeatured,
					status: 'published',
					publishedAt: post.publishedAt,
					categoryId,
					readingTime: post.readingTime
				}
			})
			.returning({ id: schema.posts.id });

		// Post tags — delete then re-insert for idempotency
		await db.delete(schema.postTags).where(eq(schema.postTags.postId, postRow.id));
		const tagRows = post.tagSlugs.map((slug) => {
			const tagId = tagIdMap.get(slug);
			if (!tagId) throw new Error(`Tag not found: ${slug}`);
			return { postId: postRow.id, tagId };
		});
		if (tagRows.length > 0) {
			await db.insert(schema.postTags).values(tagRows).onConflictDoNothing();
		}
	}
	console.log(`✓ ${POSTS.length} posts`);

	// ── Settings ──────────────────────────────────────────────────
	const settingsRows = [
		{ key: 'site_name', value: 'Open Tabs' },
		{ key: 'site_tagline', value: 'Business, politics, and geopolitics from IndexDaily Media.' },
		{ key: 'posts_per_page', value: '12' }
	];
	for (const s of settingsRows) {
		await db
			.insert(schema.settings)
			.values(s)
			.onConflictDoUpdate({ target: schema.settings.key, set: { value: s.value } });
	}
	console.log('✓ Settings');

	console.log('\nSeed complete.');
	process.exit(0);
}

seed().catch((err) => {
	console.error('Seed failed:', err);
	process.exit(1);
});
