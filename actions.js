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
	{
		title: "Happy Birthday!",
		statement:
			"Congratulations, it is your birthday! You're gifted a brand-new clothing item. Blindly pick a card from the pile of clothing items.",
		action: "card:get:clothingmarket:1",
		used: false,
	},
	{
		title: "Party Outfit",
		statement:
			"You have a party tonight, and one of your housemates has the perfect item to complete your outfit. Take one clothing item from one of the other players.",
		action: "card:get:player:1",
		used: false,
	},
	{
		title: "Piggy Bank",
		statement:
			"You broke your piggy bank and received 5 euros.",
		action: "money:add:5",
		used: false,
	},
	{
		title: "Thrift Store",
		statement:
			"You decide to bring some clothes to the second-hand clothing store. Discard one of your clothing items.",
		action: "card:discard:thriftstore",
		used: false,
	},
	{
		title: "Impulse Shopping",
		statement:
			"You bought one cheap synthetic T-shirt on a whim. That will release many microplastic fibres that end up in your environment or even in your body! Add two microplastics to the laundry room.",
		action: "microplastics:add:2",
		used: false,
	},
	{
		title: "Home Ventilation",
		statement:
			"You ventilated your home today. Fresh air = fewer microplastics. Remove 2 microplastics from the laundry room.",
		action: "microplastics:remove:2",
		used: false,
	},
	{
		title: "Thorough Vacuum",
		statement:
			"You vacuumed thoroughly today. That picked up loads of microplastic dust! Remove 2 microplastics from the laundry room.",
		action: "microplastics:remove:2",
		used: false,
	},
	// {
	// 	title: "",
	// 	statement:
	// 		"",
	// 	action: "microplastics:add:2",
	// 	used: false,
	// },
];

module.exports = actions;
