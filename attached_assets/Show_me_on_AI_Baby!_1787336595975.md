  
What we did till now

* Built and tested the MVP: automated AI-visibility audits running end-to-end across ChatGPT, Claude, Gemini, and Perplexity, scoring businesses 0–100 across four dimensions (citation rate, semantic density, structural formatting, technical access)  
* Ran a live pilot audit on a real business, surfacing a genuine, fixable issue — a robots.txt line silently blocking GPTBot  
* Built a full revenue & pricing model ([Word doc](https://docs.google.com/document/d/1N9ETpQ0FbCv8k5tMh9saduYv4K3Vi8T0/edit?usp=drive_link&ouid=102555120417784611033&rtpof=true&sd=true)) with unit economics, CAC/LTV/churn assumptions, gross margins by plan, and a 12-month and 3-year revenue projection  
* Built a complete 15-slide investor [pitch deck](https://docs.google.com/presentation/d/1r0L2l1ILD38BV0NcNSiwD0CUgi4Hjxeb/edit?usp=drive_link&ouid=102555120417784611033&rtpof=true&sd=true) following the structure specified (Cover, Problem, Solution, Product, Differentiation, Market Size, Competitor Analysis, Business Model, Revenue Streams, GTM, Traction, Financials, Team, Investment Benchmarking, Ask)  
* Researched real market sizing (global GEO software market, MENA digital marketing spend, Qatar market) and competitor landscape (Profound, Scrunch AI, Otterly.AI, Beamtrace) to ground the deck in real data  
* Researched accelerator benchmarks (Y Combinator, Techstars, QBIC/Qatar Development Bank) to calibrate a realistic funding ask  
* Identified a UI/UX gap — the product currently uses technical jargon (robots.txt, schema markup, semantic density) that non-technical SMB owners won't understand — and wrote a detailed prompt for Replit Agent to simplify the interface into plain language

What we should do now

1. We can start thinking how a  model that uses Details present on the APIs(google maps / [google.com](http://google.com) tripadvisor) ) and Gen AI to train itself to create a GTM machine  
2. TO do this we need to tell the Model the rules(NSFW, Restricted sites and how to process data  raw to Useful) and sites to use and also how the Gen AI creates our in house GenAI to auto train itself on new data it accepts  
3. In short : SMBs data is pulled and Google APIs are hit to get more data  for 1 city  then the AI needs to classify this to Business Category  then understand the competitors based on the radial distance  then it searches the details of the Client and pricing and brand reach and then says what the competitors do

PHASE 1

Business Input (Name, URL, location, category)   
 ↓

Data Collection on Business  Website crawl  
  ↓   
AI Search on varoirs sources  ChatGPT or Claude or  Gemini or Perplexity 

↓   
Verification on presence/ registration   Is the business mentioned?  Is it cited?  And learn on How is it described?  Are there visibility gaps? 

↓   
Scoring Layer 

↓   
Audit Output  Overall score and  Key issues found thenm suggest  Fix list and based on pricing Simple recommendations 

Phase II

Business Input (Name, URL, location, category) 

↓ 

Search on sources:

1. Google / public sources / directories / reviews   
2. business details   
3. location details   
4. competitor details 

↓ 

Business Classification 

1.  category   
2. sub-category   
3. service type   
4. location cluster 

↓ 

Competitor Discovery 

1.  nearby businesses  
2.   similar services   
3.  similar positioning   
4.  overlapping customer intent 

↓ 

Enriching our Client info or more Data 

1. reviews(Google/etc)   
2. pricing    
3. services   
4. online presence(TBR)  
5.  AI visibility (TBR)  
6. website quality (TBR)

↓ 

Benchmarking 

1.  client vs competitors   
2.  who is stronger where   
3.  where client is weak   
4.  where client has more improvement and growth

↓ 

Opportunity Output 

1.  competitor gaps   
2.  content gaps   
3.  service gaps   
4.  pricing/positioning gaps   
5.  visibility opportunities 

↓ 

Recommendations 

1.  what to improve first   
2.  what competitors are doing better   
3.  where the client can win 

