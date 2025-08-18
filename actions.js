const actions = [
	{
		title: "Friction Alert!",
		statement:
		"Friction alert! Wearing synthetic clothing releases microplastic fibers that end up in your environment or even in your body. Add two microplastics to the laundry room.",
		action: "microplastics:add:2",
		used: false,
	},
	{
		title: "Bad Assumption",
		statement:
		"You assumed a T-shirt was made from cotton and you did not check the label. Surprise! It is made from polyester. Add two microplastics to the laundry room.",
		action: "microplastics:add:2",
		used: false,
	},
	{
		title: "Low Laundry Load",
		statement:
			"You underfilled the washing machine--this increases friction and releases more microplastic fibres in the environment! Add two extra microplastic next time you do laundry.",
		action: "microplastics:wait:2",
		used: false,
	},
	{
		title: "Tumble Dryer",
		statement:
			"You dried your laundry with the tumble dryer this week. That releases many microplastic fibres in your indoor air! Add two microplastics to the laundry room.",
		action: "microplastics:add:2",
		used: false,
	},
	{
		title: "Synthetic Heat",
		statement:
		"You washed synthetic clothes at a very high temperature. More heat = more microplastics! Add two microplastics to the laundry room.",
		action: "microplastics:add:2",
		used: false,
	},
	{
		title: "Clothing Swap",
		statement:
			"You joined a clothing swap instead of buying new clothes. Second-hand clothes = fewer microplastics! Swap one of your clothing cards with another player's.",
		action: "swap:random",
		used: false,
	},
];

module.exports = actions;
