const cardOptions = {
  "Shirt": {
    new: [
      { material: "Linen", sort: "Natural", value: 8, price: 7 },
      { material: "Linen", sort: "Natural", value: 9, price: 7 },
      { material: "Hemp", sort: "Natural", value: 8, price: 8 },
      { material: "Hemp", sort: "Natural", value: 9, price: 8 },
      { material: "Bamboo", sort: "Natural", value: 8, price: 7 },
      { material: "Bamboo", sort: "Natural", value: 9, price: 7 },
      { material: "Cotton", sort: "Natural", value: 6, price: 8 },
      { material: "Cotton", sort: "Natural", value: 7, price: 8 },
      { material: "Acrylic", sort: "Synthetic", value: 2, price: 5 },
      { material: "Acrylic", sort: "Synthetic", value: 3, price: 5 },
      { material: "Acrylic", sort: "Synthetic", value: 2, price: 6 },
      { material: "Acrylic", sort: "Synthetic", value: 3, price: 6 },
      { material: "Polyester", sort: "Synthetic", value: 2, price: 5 },
      { material: "Polyester", sort: "Synthetic", value: 3, price: 5 },
      { material: "Polyester", sort: "Synthetic", value: 2, price: 6 },
      { material: "Polyester", sort: "Synthetic", value: 3, price: 6 },
      { material: "Polyester", sort: "Synthetic", value: 2, price: 5 },
      { material: "Elastane", sort: "Synthetic", value: 3, price: 5 },
      { material: "Elastane", sort: "Synthetic", value: 2, price: 6 },
      { material: "Elastane", sort: "Synthetic", value: 3, price: 6 },
      { material: "Nylon", sort: "Synthetic", value: 2, price: 5 },
      { material: "Nylon", sort: "Synthetic", value: 3, price: 5 },
      { material: "Nylon", sort: "Synthetic", value: 2, price: 6 },
    ],
    secondHand: [
      { material: "Linen", sort: "Natural", value: 10, price: 5 },
      { material: "Hemp", sort: "Natural", value: 11, price: 5 },
      { material: "Bamboo", sort: "Natural", value: 10, price: 4 },
      { material: "Cotton", sort: "Natural", value: 11, price: 4 },
      { material: "Acrylic", sort: "Synthetic", value: 5, price: 3 },
      { material: "Polyester", sort: "Synthetic", value: 4, price: 3 },
      { material: "Elastane", sort: "Synthetic", value: 5, price: 2 },
      { material: "Nylon", sort: "Synthetic", value: 4, price: 2 },
    ]
  },
  "Pants": {
    new: [
      { material: "Linen", sort: "Natural", value: 9, price: 9 },
      { material: "Linen", sort: "Natural", value: 8, price: 9 },
      { material: "Hemp", sort: "Natural", value: 9, price: 10 },
      { material: "Bamboo", sort: "Natural", value: 8, price: 10 },
      { material: "Cotton", sort: "Natural", value: 9, price: 9 },
      { material: "Cotton", sort: "Natural", value: 8, price: 9 },
      { material: "Polyester", sort: "Synthetic", value: 3, price: 7 },
      { material: "Polyester", sort: "Synthetic", value: 2, price: 7 },
      { material: "Polyester", sort: "Synthetic", value: 3, price: 8 },
      { material: "Elastane", sort: "Synthetic", value: 2, price: 8 },
      { material: "Elastane", sort: "Synthetic", value: 3, price: 7 },
      { material: "Elastane", sort: "Synthetic", value: 2, price: 7 },
      { material: "Nylon", sort: "Synthetic", value: 3, price: 8 },
      { material: "Nylon", sort: "Synthetic", value: 2, price: 8 },
    ],
    secondHand: [
      { material: "Linen", sort: "Natural", value: 11, price: 7 },
      { material: "Bamboo", sort: "Natural", value: 10, price: 6 },
      { material: "Cotton", sort: "Natural", value: 11, price: 7 },
      { material: "Polyester", sort: "Synthetic", value: 4, price: 5 },
      { material: "Elastane", sort: "Synthetic", value: 5, price: 4 },
      { material: "Nylon", sort: "Synthetic", value: 4, price: 5 },
    ]
  },
  "Sweater": {
    new: [
      { material: "Linen", sort: "Natural", value: 9, price: 11 },
      { material: "Hemp", sort: "Natural", value: 8, price: 11 },
      { material: "Bamboo", sort: "Natural", value: 9, price: 12 },
      { material: "Cotton", sort: "Natural", value: 8, price: 12 },
      { material: "Acrylic", sort: "Synthetic", value: 2, price: 9 },
      { material: "Acrylic", sort: "Synthetic", value: 3, price: 10 },
      { material: "Polyester", sort: "Synthetic", value: 2, price: 9 },
      { material: "Polyester", sort: "Synthetic", value: 3, price: 10 },
      { material: "Elastane", sort: "Synthetic", value: 2, price: 9 },
      { material: "Elastane", sort: "Synthetic", value: 3, price: 10 },
      { material: "Nylon", sort: "Synthetic", value: 2, price: 9 },
      { material: "Nylon", sort: "Synthetic", value: 3, price: 10 },
    ],
    secondHand: [
      { material: "Linen", sort: "Natural", value: 11, price: 9 },
      { material: "Bamboo", sort: "Natural", value: 11, price: 9 },
      { material: "Cotton", sort: "Natural", value: 10, price: 8 },
      { material: "Polyester", sort: "Synthetic", value: 5, price: 7 },
      { material: "Nylon", sort: "Synthetic", value: 4, price: 6 },
    ]
  },
  "Jacket": {
    new: [
      { material: "Linen", sort: "Natural", value: 8, price: 13 },
      { material: "Bamboo", sort: "Natural", value: 9, price: 14 },
      { material: "Cotton", sort: "Natural", value: 8, price: 13 },
      { material: "Acrylic", sort: "Synthetic", value: 3, price: 11 },
      { material: "Acrylic", sort: "Synthetic", value: 2, price: 11 },
      { material: "Polyester", sort: "Synthetic", value: 3, price: 11 },
      { material: "Polyester", sort: "Synthetic", value: 2, price: 12 },
      { material: "Elastane", sort: "Synthetic", value: 3, price: 12 },
    ],
    secondHand: [
      { material: "Hemp", sort: "Natural", value: 11, price: 10 },
      { material: "Polyester", sort: "Synthetic", value: 5, price: 8 },
    ]
  }
};

module.exports = cardOptions;
