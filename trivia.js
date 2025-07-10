const trivia = [
	{
		title: "Dutch Environment Care",
		statement: "Only a minority of Dutch people care about the environment",
		answer: false,
		reasoning:
			"A recent study of the Dutch population revealed that a significant majority of people (around 70%) care about the environment.",
		used: false,
	},
	{
		title: "Sustainable Fashion in Europe",
		statement:
			"The large majority of people in Europe buy sustainable fashion items",
		answer: false,
		reasoning:
			"It was 46% in 2022, but the number has been increasing in recent years!",
		used: false,
	},
	{
		title: "Dutch Laundry Habits",
		statement:
			"The large majority of Dutch people wash clothes at a low temperature",
		answer: true,
		reasoning:
			"A recent study on the Dutch population showed that 88% of Dutch people wash clothes at 40 degrees or below. This simple habit helps protect fabrics and reduce fiber shedding.",
		used: false,
	},
	{
		title: "Comfortable Natural Clothes",
		statement:
			"Most people think that natural clothes are more comfortable than synthetic clothes",
		answer: true,
		reasoning:
			"A study has shown that people have a stronger preference for natural fibers over synthetic fabrics; cotton was especially preferred as considered to be more comfortable.",
		used: false,
	},
	{
		title: "Car Tyres and Microplastics",
		statement:
			"Car tyres are the largest source of microplastics in the Netherlands.",
		answer: true,
		reasoning:
			"Due to friction when driving and degradation, car tires represent the greatest source of microplastics, followed by packaging and plastic used in agriculture.",
		used: false,
	},
	{
		title: "Paint and Microplastics",
		statement: "Paint is a source of microplastics pollution",
		answer: true,
		reasoning:
			"Paint is a source of microplastic pollution in the oceans. Paint microplastics mainly come from ships and boats used for commercial and recreational purposes.",
		used: false,
	},
	{
		title: "E-Waste and Plastic",
		statement: "Circa 1/4 of our electronic waste is plastic.",
		answer: true,
		reasoning: "Around 15-20% of the e-waste is plastic or part plastic.",
		used: false,
	},
	{
		title: "Plastic Packaging in EU",
		statement:
			"Within the EU, almost half of all plastic is used for packaging.",
		answer: true,
		reasoning: "Circa 44% of plastic is used for packaging.",
		used: false,
	},
	{
		title: "Packaging Waste in EU",
		statement:
			"Within the EU, more than half of packaging waste is plastic",
		answer: false,
		reasoning: "Circa 20 percent of the packaging waste is plastic.",
		used: false,
	},
	{
		title: "Microplastics in Drinking Water",
		statement: "Our drinking water contains microplastics.",
		answer: true,
		reasoning:
			"Microplastics have indeed been found in our drinking water. However, the water we drink from plastic bottles contains more microplastics than tap water. It is estimated that a person drinking bottled water may ingest in a year 22.5 times more microplastics than a person drinking tap water.",
		used: false,
	},
	{
		title: "Plastic Floating on Water",
		statement:
			"Plastic and microplastics float in water. This is why large amounts accumulate on the ocean's surface, while very little is found in the deep sea.",
		answer: false,
		reasoning:
			"Not all types of plastic float on the surfaces. Microplastics can be also found in the deep ocean floor.",
		used: false,
	},
	{
		title: "Effectiveness of Open Ocean Clean-up Projects",
		statement:
			"Open ocean clean-up projects are extremely effective in tackling plastic pollution.",
		answer: false,
		reasoning:
			"It is still unclear how effective clean-up projects on the open oceans are in countering plastic pollution. The projects are effective in cleaning up larger pieces of plastic at the surface before they can break down into microplastics. However, these projects are not capable of cleaning up microplastics or reaching plastic below the surface water.",
		used: false,
	},
	{
		title: "Role of Microbes in Plastic Breakdown",
		statement:
			"Microbes are capable of breaking down plastic and will be the solution for microplastic pollution",
		answer: false,
		reasoning:
			"Researchers have identified bacteria and fungi that are able to break down some plastics, but this was investigated only in industrial conditions and with some types of plastic. In addition, breaking down plastic might be an even more toxic process.",
		used: false,
	},
	{
		title: "Size of the Great Pacific Garbage Patch",
		statement:
			"The Great Pacific Garbage Patch (also called Garbage Island or Plastic soup) is large enough that it can be seen from space.",
		answer: false,
		reasoning:
			"The Great Pacific Garbage Patch is mainly made up of fishing nets and gear, and it resembles a plastic soup rather than a plastic island. Not all of the plastic floats on the surface; many sink beneath it. And part of this is composed by microplastics. These characteristics make the patch difficult to see from space, despite its large size.",
		used: false,
	},
	{
		title: "Annual Plastic Waste Production",
		statement:
			"150 million tonnes of plastic waste are created every year.",
		answer: false,
		reasoning:
			"400 million tonnes of plastic waste is created every year according to the UN Environmental Programme.",
		used: false,
	},
	{
		title: "Plastic Waste in Agriculture",
		statement:
			"40% of plastic products produced are thrown away one month after purchase.",
		answer: true,
		reasoning: "",
		used: false,
	},
	{
		title: "Impact of Plastic on the Agricultural Sector",
		statement:
			"The use of plastic in the agricultural sector is harmful to the environment.",
		answer: true,
		reasoning:
			"Plastic in the agricultural sector is mostly used for greenhouses, shade cloth, and irrigation systems. Microplastics originating from it end up in soil, plants and our food.",
		used: false,
	},
	{
		title: "Plastic Particles in Water Bottles",
		statement:
			"Water in plastic bottle contains hundreds of thousands of tiny plastic particles.",
		answer: true,
		reasoning:
			"It is estimated that 1 liter of bottled water may contains up to 240,000 microplastic particles.",
		used: false,
	},
	{
		title: "Infectious Diseases and Plastic Trash",
		statement:
			"The increasing amount of plastic trash in our environment increases the risk of infectious diseases.",
		answer: true,
		reasoning:
			"Plastics can retain water; this water is a potential breeding ground for insects. The more plastic lying around, the more potential breeding grounds. More breeding grounds mean more mosquitoes and thus a greater chance of transmitting diseases such as Malaria, Zika or Dengue. There is a direct link between stray plastic and the risk of infectious diseases.",
		used: false,
	},
	{
		title: "Plastic in Rainwater",
		statement: "Every day, somewhere in the world, it rains microplastics.",
		answer: true,
		reasoning:
			"Several research studies have found microplastics in rainwater.",
		used: false,
	},
	{
		title: "Microplastic Pollution in Oceans",
		statement:
			"2 million tons of plastic debris enter our oceans every year.",
		answer: false,
		reasoning:
			"It was estimated that every year 11 million tons of plastic debris enter the ocean.",
		used: false,
	},
	{
		title: "Microplastics in Antarctic Snow",
		statement: "Microplastics have been found in Antarctic snow",
		answer: true,
		reasoning:
			"Microplastics have been found in remote places, even Antarctic snow a few years ago.",
		used: false,
	},
	{
		title: "Plastic in microwaves",
		statement:
			"Heating food in plastic containers in the microwave release microplastics.",
		answer: true,
		reasoning:
			"When plastic is heated, microplastics are released more easily. Did you know certain types of ceramic and glass are safe to microwave? Use your plate or non-plastic containers to heat up your food!",
		used: false,
	},
	{
		title: "Plastic Containers and Microplastics",
		statement:
			"Soft plastics (like takeaway containers) are 'worse' than hard plastics in terms of how much microplastics are released",
		answer: true,
		reasoning:
			"Soft plastics release indeed more microplastics than hard containers. Try to avoid takeaway food packaged in plastic!",
		used: false,
	},
	{
		title: "Soft Plastics vs Hard Plastics",
		statement:
			"Of the 10 most popular cosmetic brand in Europe, 4 contains microplastics",
		answer: false,
		reasoning:
			"According an analysis by Plastic Soup Foundation, 9 out of 10 personal care products contained microplastics. But did you know that the Netherlands is the first country to ban cosmetics with microplastics? If you are staying abroad you can use the Beat The Microbead app to find out if products contain microplastics.",
		used: false,
	},
	{
		title: "Cosmetics and Microplastics",
		statement:
			"Of the 10 most popular cosmetic brand in Europe, 4 contains microplastics",
		answer: false,
		reasoning:
			"According an analysis by Plastic Soup Foundation, 9 out of 10 personal care products contained microplastics. But did you know that the Netherlands is the first country to ban cosmetics with microplastics? If you are staying abroad you can use the Beat The Microbead app to find out if products contain microplastics.",
		used: false,
	},
];

module.exports = trivia;
