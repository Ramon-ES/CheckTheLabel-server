const actions = [
	{
		name: "frictionalert",
		texture: "action-n-frictionalert.png",
		title: "Friction Alert!",
		statement:
		"Friction alert! Wearing synthetic clothing releases microplastic fibers that end up in your environment or even in your body. Add two microplastics.",
		action: "microplastics:add:2",
		used: false,
	},
	{
		name: "badassumption",
		texture: "action-n-badassumption.png",
		title: "Bad Assumption",
		statement:
		"You assumed a T-shirt was made from cotton and you did not check the label. Surprise! It is made from polyester. Add two microplastics.",
		action: "microplastics:add:2",
		used: false,
	},
	{
		name: "lowlaundryload",
		texture: "action-n-lowlaundryload.png",
		title: "Low Laundry Load",
		statement:
			"You underfilled the washing machine--this increases friction and releases more microplastic fibres in the environment! Add two extra microplastic next time you do laundry.",
		action: "microplastics:wait:2",
		used: false,
	},
	{
		name: "tumbledryer",
		texture: "action-n-tumbledryer.png",
		title: "Tumble Dryer",
		statement:
			"You dried your laundry with the tumble dryer this week. That releases many microplastic fibres in your indoor air! Add two microplastics.",
		action: "microplastics:add:2",
		used: false,
	},
	{
		name: "syntheticheat",
		texture: "action-n-syntheticheat.png",
		title: "Synthetic Heat",
		statement:
		"You washed synthetic clothes at a very high temperature. More heat = more microplastics! Add two microplastics.",
		action: "microplastics:add:2",
		used: false,
	},
	// {
	// 	name: "clothingswap",
	// 	texture: "action-p-clothingswap.png",
	// 	title: "Clothing Swap",
	// 	statement:
	// 		"You joined a clothing swap instead of buying new clothes. Second-hand clothes = fewer microplastics! Swap one of your clothing cards with another player's.",
	// 	action: "swap:random",
	// 	used: false,
	// },
	{
		name: "happybirthday",
		texture: "action-p-happybirthday.png",
		title: "Happy Birthday!",
		statement:
			"Congratulations, it is your birthday! You're gifted a brand-new clothing item. Blindly pick a card from the pile of clothing items.",
		action: "card:get:clothingmarket:1",
		used: false,
	},
	{
		name: "partyoutfit",
		texture: "action-p-partyoutfit.png",
		title: "Party Outfit",
		statement:
			"You have a party tonight, and one of your housemates has the perfect item to complete your outfit. Take one clothing item from one of the other players.",
		action: "card:get:player:1",
		used: false,
	},
	{
		name: "piggybank",
		texture: "action-p-piggybank.png",
		title: "Piggy Bank",
		statement:
			"You broke your piggy bank and received 5 euros.",
		action: "money:add:5",
		used: false,
	},
	{
		name: "thriftstore",
		texture: "action-n-thriftstore.png",
		title: "Thrift Store",
		statement:
			"You decide to bring some clothes to the second-hand clothing store. Discard one of your clothing items.",
		action: "card:discard:thriftstore",
		used: false,
	},
	{
		name: "impulseshopping",
		texture: "action-n-impulseshopping.png",
		title: "Impulse Shopping",
		statement:
			"You bought one cheap synthetic T-shirt on a whim. That will release many microplastic fibres that end up in your environment or even in your body! Add two microplastics.",
		action: "microplastics:add:2",
		used: false,
	},
	{
		name: "homeventilation",
		texture: "action-p-homeventilation.png",
		title: "Home Ventilation",
		statement:
			"You ventilated your home today. Fresh air = fewer microplastics. Remove 2 microplastics.",
		action: "microplastics:remove:2",
		used: false,
	},
	{
		name: "thoroughvacuum",
		texture: "action-p-thoroughvacuum.png",
		title: "Thorough Vacuum",
		statement:
			"You vacuumed thoroughly today. That picked up loads of microplastic dust! Remove 2 microplastics.",
		action: "microplastics:remove:2",
		used: false,
	},
	// ---------------------- to do
	// {
	// 	name: "fulllaundryload",
	// 	texture: "action-p-fulllaundryload.png",
	// 	title: "Full Laundry Load",
	// 	statement:
	// 		"You chose to wash a full load of laundry. Less free space = less friction. Keep this card until the next laundry cycle, then add only half the usual microplastics.",
	// 	action: "",
	// 	used: false,
	// },
	// {
	// 	name: "coldwaterwash",
	// 	texture: "action-p-coldwaterwash.png",
	// 	title: "Cold Water Wash",
	// 	statement:
	// 		"You washed your laundry with cold water to reduce fibre shedding. Cold temperature = fewer microplastics. That was easy! Keep this card until the next laundry cycle, then add only half the usual microplastics.",
	// 	action: "",
	// 	used: false,
	// },
	// {
	// 	name: "microfiberbag",
	// 	texture: "action-p-microfiberbag.png",
	// 	title: "Microfiber Bag",
	// 	statement:
	// 		"You used a microfiber-catching laundry bag. That traps some of the plastic! Keep this card until the next laundry cycle, then add only half the usual microplastics.",
	// 	action: "",
	// 	used: false,
	// },
	// {
	// 	name: "airdrying",
	// 	texture: "action-p-airdrying.png",
	// 	title: "Air-drying",
	// 	statement:
	// 		"You air-dried your laundry instead of using a tumble dryer. You prevented a lot of microplastics from getting into the air. Smart move! Keep this card until the next laundry cycle, then add only half the usual microplastics.",
	// 	action: "",
	// 	used: false,
	// },
	// {
	// 	name: "secondlhandstuff",
	// 	texture: "action-p-secondlhandstuff.png",
	// 	title: "Secondhand Stuff",
	// 	statement:
	// 		"You're buying only second-hand clothes this month. Second-hand clothes = fewer microplastics! Exchange this card for the most expensive second-hand clothing item in the clothing market. If there are no second hand items, keep this card and use it when a second hand item becomes available.",
	// 	action: "",
	// 	used: false,
	// },
	// {
	// 	name: "organiccotton",
	// 	texture: "action-p-organiccotton.png",
	// 	title: "Organic Cotton",
	// 	statement:
	// 		"You chose organic cotton over synthetic clothes. Cotton = no microplastics! Keep this card and exchange it for a free cotton clothing item when available in the clothing market.",
	// 	action: "",
	// 	used: false,
	// },
	// {
	// 	name: "loanshark",
	// 	texture: "action-p-loanshark.png",
	// 	title: "Loan Shark",
	// 	statement:
	// 		"A housemate borrowed some money from you to buy a new shirt, and is ready to pay you back. The richest other player pays you 5 euro.",
	// 	action: "",
	// 	used: false,
	// },
	// {
	// 	name: "debttoafriend",
	// 	texture: "action-n-debttoafriend.png",
	// 	title: "Debt to a friend",
	// 	statement:
	// 		"You borrowed some money from a housemate, and you have to pay them back. Give the poorest player 5 euro.",
	// 	action: "",
	// 	used: false,
	// },
	// {
	// 	name: "allnatural",
	// 	texture: "action-p-allnatural.png",
	// 	title: "All Natural",
	// 	statement:
	// 		"Your favorite clothing brand just launched an all-natural collection. Refresh the clothing market with only natural clothes.",
	// 	action: "",
	// 	used: false,
	// },
	// {
	// 	name: "marketflood",
	// 	texture: "action-n-marketflood.png",
	// 	title: "Market Flood",
	// 	statement:
	// 		"The market is getting flooded with cheap synthetic clothes. Refresh the clothing market with only synthetic clothes.",
	// 	action: "",
	// 	used: false,
	// },
	// {
	// 	name: "lotteryticket",
	// 	texture: "action-p-lotteryticket.png",
	// 	title: "Lottery Ticket",
	// 	statement:
	// 		"You buy a lottery ticket. If your money-die landed on 1 or 6 this turn, get 20 euro.",
	// 	action: "",
	// 	used: false,
	// },
	// {
	// 	name: "charitycase",
	// 	texture: "action-n-charitycase.png",
	// 	title: "Charity Case",
	// 	statement:
	// 		"You choose to give one of your clothes to charity. Discard the cheapest piece of synthetic clothing from your wardrobe to remove 2 microplastics.",
	// 	action: "",
	// 	used: false,
	// },
	// {
	// 	name: "newlook",
	// 	texture: "action-p-newlook.png",
	// 	title: "New Look",
	// 	statement:
	// 		"You decide to make some positive changes in your wardrobe. Change the oldest synthetic item you have to a natural item.",
	// 	action: "",
	// 	used: false,
	// },
	// {
	// 	name: "houserules",
	// 	texture: "action-n-houserules.png",
	// 	title: "House Rules",
	// 	statement:
	// 		"Your housemates agree: let's wash at colder temperatures to release fewer airborne fibres into the house. You stick to the plan. Next time you do laundry, add 1 fewer microplastic to indoor air.",
	// 	action: "microplastics:add:2",
	// 	used: false,
	// },
	/// ------------------------------------ end of todo
	
	{
		name: "freshairtrend",
		texture: "action-p-freshairtrend.png",
		title: "Fresh Air Trend",
		statement:
			"Most of your friends spend time outside - it feels fresher than indoors. Indoor air often traps airborne microplastics. You join them for some clean air. Remove 1 microplastic from indoor air.",
		action: "microplastics:remove:1",
		used: false,
	},
	{
		name: "naturaliscool",
		texture: "action-p-naturaliscool.png",
		title: "Natural is Cool",
		statement:
			"In your group, cotton and linen are the favorite fabrics. Natural fibres shed fewer airborne microplastics, so you fit right in. Remove 1 microplastic from indoor air.",
		action: "microplastics:remove:1",
		used: false,
	},
	// {
	// 	name: "fastfashioneverywhere",
	// 	texture: "action-n-fastfashion.png",
	// 	title: "Fast Fashion Everywhere",
	// 	statement:
	// 		"Most stores push polyester and nylon. It's the norm in fast fashion - unfortunately, these synthetics shed more airborne microplastics when worn and washed. Add 1 microplastic to indoor air.",
	// 	action: "microplastics:add:1",
	// 	used: false,
	// },
	{
		name: "catchuplaundryhabits",
		texture: "action-p-laundryhabits.png",
		title: "Catch up: Laundry Habits",
		statement:
			"Your friends are washing at colder, shorter cycles. You also do your part - less heat means fewer fibers floating around! Remove 2 microplastic from indoor air.",
		action: "microplastics:remove:2",
		used: false,
	},
	{
		name: "catchupshoppinghabits",
		texture: "action-p-shoppinghabits.png",
		title: "Catch up: Shopping Habits",
		statement:
			"Your friends are switching to natural and second-hand clothes. You rise to the challenge - good for your style and for your wallet! Gain 2 euros.",
		action: "money:add:2",
		used: false,
	},
	// {
	// 	title: "",
	// 	statement:
	// 		"",
	// 	action: "microplastics:add:2",
	// 	used: false,
	// },
	// {
	// 	title: "",
	// 	statement:
	// 		"",
	// 	action: "microplastics:add:2",
	// 	used: false,
	// },
];

module.exports = actions;
