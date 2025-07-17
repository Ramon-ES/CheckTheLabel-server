const actions = [
	{
		title: "Cheap shirts",
		statement:
			"You bought one cheap synthetic T-shirt on a whim. That will release many microplastics fibres that end up in your environment or even in your body! Add two microplastics to the laundry room.",
		action: "microplastics:add:2",
		used: false,
	},
	{
		title: "underfilled",
		statement:
			"You underfilled the washing machine--this increases friction and releases more microplastic fibres in the environment! Add two extra microplastic next time you do laundry.",
		action: "microplastics:wait:2",
		used: false,
	},
	{
		title: "Tumble dryer",
		statement:
			"You dried your laundry with the tumble dryer this week. That releases many microplastic fibres in your indoor air! Add two microplastics to the laundry room.",
		action: "microplastics:add:2",
		used: false,
	},
	{
		title: "High temperature",
		statement:
			"You washed synthetic clothes at a very high temperature. More heat = more microplastics! Add two microplastics to the laundry room.",
		action: "microplastics:add:2",
		used: false,
	},
	{
		title: "Friction!",
		statement:
			"Friction alert! Wearing synthetic clothing releases microplastic fibers that end up in your environment or even in your body. Add two microplastics to the laundry room.",
		action: "microplastics:add:2",
		used: false,
	},
	{
		title: "Label check!",
		statement:
			"You assumed a T-shirt was made from cotton and you did not check the label. Surprise! It is made from polyester. Add two microplastics to the laundry room.",
		action: "microplastics:add:2",
		used: false,
	},
];

module.exports = actions;
