const trivia = [
	{
		title: "Microplastic Particle Size",
		statement: "The smallest microplastic particle found by scientists are comparable in thickness to a human hair",
		answer: false,
		reasoning:
			"Microplastics can be as small as a virus (100 nanometers). Below 100 nanometers, these particles are called nanoplastics.",
		used: false,
		prioritize: true,
	},
	{
		title: "Global Plastic Recycling",
		statement: "Most global plastic waste is recycled.",
		answer: false,
		reasoning:
			"Only 9% of plastic waste is recycled globally. Of all the plastic packaging waste in the Netherlands, only 7% is recycled to make new packaging. That's why it is important to reduce plastic use in our daily life.",
		used: false,
		prioritize: true,
	},
	{
		title: "Microplastics in Human Placenta",
		statement: "Microplastics have been found in the human placenta.",
		answer: true,
		reasoning:
			"In 2020, a group of researchers found evidence for microplastics in placentas. More recently, microplastics have also been found in other parts of our body, like human blood and the human brain.",
		used: false,
		prioritize: true,
	},
	{
		title: "Synthetic Clothing and Ocean Microplastics",
		statement: "Microplastics from washing synthetic clothing account for about 15% of the total microplastics present in the oceans.",
		answer: false,
		reasoning:
			"Microplastics released during the washing of synthetic clothing is estimated to be 35% and be the main sources of microplastics in the oceans.",
		used: false,
		prioritize: true,
	},
	{
		title: "Plants and Microplastics",
		statement: "Plants grow normally despite the presence of microplastics, while algae are affected.",
		answer: false,
		reasoning:
			"Microplastics can harm both plants and algae, for example by damaging roots and affecting photosynthesis, making it harder for them to get nutrients and grow.",
		used: false,
		prioritize: true,
	},
	{
		title: "Inhaling Microplastics",
		statement: "Microplastics can be inhaled.",
		answer: true,
		reasoning:
			"Microplastic particles are so small they can float in indoor air and reach your lungs. We are chronically exposed to microplastics in the air through breathing. Ventilating your home can reduce this exposure.",
		used: false,
		prioritize: true,
	},
	{
		title: "Animal Health Effects",
		statement: "Microplastics cause a wide range of health problems to animals.",
		answer: true,
		reasoning:
			"In animals, microplastics can cause problems with growth and reproduction, damage their DNA, upset their bodies' functions, and even change their behaviour.",
		used: false,
		prioritize: true,
	},
	{
		title: "Human Health Research",
		statement: "There is no research yet showing health effects of microplastics in humans",
		answer: false,
		reasoning:
			"In humans, microplastics have been associated with inflammation, breathing problems, and a higher risk of cancer.",
		used: false,
		prioritize: true,
	},
	{
		title: "Microplastic Ingestion Sources",
		statement: "The amount of microplastics we ingest depends exclusively on our diet",
		answer: false,
		reasoning:
			"Some food and drinks we consume, like fish and bottled water, contain more microplastics. However, there is also a significant amount of microplastics floating in our air, which then settle on our food, which we ingest.",
		used: false,
		prioritize: true,
	},
	{
		title: "Washing Machine Filters",
		statement: "Special washing machine filters for microplastics can capture 100% of microplastics",
		answer: false,
		reasoning:
			"It is difficult to estimate the precise amount, but previous research found that no filters are currently able to capture all microplastics. That is why it is important to always check the label and choose clothes made with as little synthetic fabric as possible.",
		used: false,
		prioritize: true,
	},
	{
		title: "Indoor Air Microplastics",
		statement: "The majority of microplastics fluctuating in the air inside your house comes from outside",
		answer: false,
		reasoning:
			"Most microplastics in your indoor air come from your own synthetic clothes and household textile, so ventilate regularly! If you live in an area with heavy traffic, ventilate at night when there is less traffic.",
		used: false,
		prioritize: true,
	},
	{
		title: "Quick Microplastic Reduction",
		statement: "There are actions you can take (that only take a few seconds) and can help you to reduce your exposure to microplastics drastically.",
		answer: true,
		reasoning:
			"Opening your window and thereby ventilating your house is considered by experts one of the core actions to reduce microplastics in your house",
		used: false,
		prioritize: true,
	},
	{
		title: "Single-use Plastics",
		statement: "Most of the world's population wants to get rid of single-use plastics.",
		answer: true,
		reasoning:
			"A World Wildlife Fund survey in 32 countries found that 87% of people wanted to get rid of plastic types that cannot be recycled. This shows strong global public support to phase out hard-to-recycle plastics",
		used: false,
		prioritize: true,
	},
	{
		title: "Dutch Environment Care",
		statement: "Only a minority of Dutch people care about the environment.",
		answer: false,
		reasoning:
			"A recent study of the Dutch population revealed that a significant majority of people (around 70%) care about the environment.",
		used: false,
		prioritize: true,
	},
	{
		title: "Sustainable Fashion in Europe",
		statement: "Only a small minority of people in Europe buy sustainable fashion, which is made with less harm to people and the environment.",
		answer: false,
		reasoning:
			"It was 46% in 2022, but the number has been increasing in recent years!",
		used: false,
		prioritize: true,
	},
	{
		title: "Dutch Laundry Habits",
		statement: "The large majority of Dutch people wash clothes at a low temperature.",
		answer: true,
		reasoning:
			"A recent study on the Dutch population showed that 88% of Dutch people wash clothes at 40 degrees or below. This simple habit helps protect fabrics and reduce fibre shedding.",
		used: false,
		prioritize: true,
	},
	{
		title: "Natural vs Synthetic Clothing Comfort",
		statement: "Most people think that natural clothes are more comfortable than synthetic clothes.",
		answer: true,
		reasoning:
			"A study has shown that people have a stronger preference for natural fibres over synthetic fibres; cotton was especially preferred as it was considered to be more comfortable.",
		used: false,
		prioritize: true,
	},
	{
		title: "Microplastic Water Solubility",
		statement: "Microplastics are easily soluble in water.",
		answer: false,
		reasoning:
			"Microplastics are defined as \"any solid plastic particle of 5 mm or less which are insoluble in water\" (United Nations Environment Programme).",
		used: false,
		prioritize: false,
	},
	{
		title: "Animal Species and Microplastics",
		statement: "Microplastics have been identified in more than 1300 animal species.",
		answer: true,
		reasoning:
			"Researchers have found that at least 1500 animal species ingest microplastics through the food chain, with over 1200 of them being marine species.",
		used: false,
		prioritize: false,
	},
	{
		title: "Human Health Research Status",
		statement: "A lot of scientific knowledge already exists on the effects of microplastics on human health.",
		answer: false,
		reasoning:
			"Research on the health effects of microplastics is still in the early stage, but it is rapidly increasing.",
		used: false,
		prioritize: false,
	},
	{
		title: "Floating Ocean Plastic",
		statement: "New research estimates the extent of floating plastic in the oceans is at 3.2 million tonnes.",
		answer: true,
		reasoning:
			"This was estimate for 2020",
		used: false,
		prioritize: false,
	},
	{
		title: "Nanoplastics and Lead Absorption",
		statement: "Nanoplastics can absorb up to 30% of lead within 5 minutes.",
		answer: false,
		reasoning:
			"Recent research showed that Nanoplastics can absorb up to 99% of lead in 5 minutes, carrying them into the environment. Long-term exposure to heavy metals has been linked to health and developmental problems in children.",
		used: false,
		prioritize: false,
	},
	{
		title: "Global Textile Production",
		statement: "More than 90% of the textile produced worldwide is synthetic",
		answer: false,
		reasoning:
			"Around 60% of textiles produced worldwide are synthetic, mainly polyester, acrylic, and nylon. However, natural fibres are still widely produced, so there are still plenty of others options available!",
		used: false,
		prioritize: false,
	},
	{
		title: "Microplastics and Skin Contact",
		statement: "Microplastics can enter the human body via skin contact.",
		answer: true,
		reasoning:
			"Small microplastics can penetrate skin pores. How much microplastics penetrate the skin depends on pore size, which varies from person to person.",
		used: false,
		prioritize: false,
	},
];

module.exports = trivia;
