/**
 * Category Suggestion Service
 * 
 * Provides intent-based category suggestions for food items
 * based on keyword matching and food classification rules
 */

// Food category definitions with keywords
export const FOOD_CATEGORIES: Record<string, string[]> = {
  'Burger': [
    'burger', 'hamburger', 'cheeseburger', 'patty', 'bun', 'whopper',
    'big mac', 'quarter pounder', 'double', 'triple', 'smash burger',
    'wagyu burger', 'beef burger', 'chicken burger', 'veggie burger'
  ],
  'Pizza': [
    'pizza', 'pepperoni', 'margherita', 'hawaiian', 'meat lovers',
    'supreme', 'calzone', 'flatbread', 'thin crust', 'deep dish',
    'stuffed crust', 'neapolitan', 'sicilian'
  ],
  'Kebab': [
    'kebab', 'kebap', 'doner', 'döner', 'shawarma', 'gyro', 'gyros',
    'souvlaki', 'kofta', 'kofte', 'shish', 'seekh', 'adana', 'iskender',
    'wrap', 'pita', 'durum', 'lahmacun'
  ],
  'Fried Chicken': [
    'fried chicken', 'chicken wings', 'wings', 'drumstick', 'thigh',
    'breast', 'tender', 'strip', 'nugget', 'popcorn chicken', 'karaage',
    'crispy chicken', 'hot chicken', 'nashville', 'korean fried'
  ],
  'Rice & Noodles': [
    'rice', 'nasi', 'fried rice', 'nasi goreng', 'biryani', 'pilaf',
    'noodle', 'mie', 'ramen', 'udon', 'soba', 'pho', 'pad thai',
    'lo mein', 'chow mein', 'laksa', 'kwetiau', 'bihun', 'spaghetti',
    'pasta', 'fettuccine', 'linguine', 'penne', 'macaroni'
  ],
  'Drinks': [
    'drink', 'beverage', 'juice', 'smoothie', 'shake', 'milkshake',
    'coffee', 'tea', 'boba', 'bubble tea', 'soda', 'cola', 'sprite',
    'fanta', 'water', 'mineral', 'lemonade', 'iced', 'hot', 'cold',
    'frappe', 'latte', 'cappuccino', 'espresso', 'americano', 'mocha'
  ],
  'Desserts': [
    'dessert', 'cake', 'ice cream', 'gelato', 'sundae', 'brownie',
    'cookie', 'donut', 'doughnut', 'pie', 'pudding', 'mousse',
    'cheesecake', 'tiramisu', 'parfait', 'waffle', 'pancake', 'crepe',
    'churros', 'mochi', 'sweet', 'chocolate', 'caramel', 'vanilla'
  ],
  'Appetizers': [
    'appetizer', 'starter', 'snack', 'fries', 'chips', 'wedges',
    'onion rings', 'mozzarella sticks', 'spring roll', 'samosa',
    'dim sum', 'dumpling', 'gyoza', 'edamame', 'nachos', 'loaded',
    'garlic bread', 'breadstick', 'soup', 'salad', 'coleslaw'
  ],
  'Seafood': [
    'fish', 'salmon', 'tuna', 'cod', 'shrimp', 'prawn', 'lobster',
    'crab', 'squid', 'calamari', 'octopus', 'clam', 'mussel', 'oyster',
    'sushi', 'sashimi', 'seafood', 'grilled fish', 'fish and chips'
  ],
  'Sandwiches': [
    'sandwich', 'sub', 'hoagie', 'panini', 'grilled cheese', 'blt',
    'club', 'toast', 'toastie', 'bagel', 'croissant', 'baguette',
    'ciabatta', 'focaccia', 'wrap'
  ],
  'Mexican': [
    'taco', 'burrito', 'quesadilla', 'enchilada', 'fajita', 'nacho',
    'guacamole', 'salsa', 'tortilla', 'mexican', 'tex-mex', 'chimichanga'
  ],
  'Asian': [
    'asian', 'chinese', 'japanese', 'korean', 'thai', 'vietnamese',
    'indonesian', 'malaysian', 'indian', 'curry', 'teriyaki', 'satay',
    'rendang', 'tempura', 'katsu', 'bibimbap', 'bulgogi', 'tom yum'
  ],
  'Healthy': [
    'healthy', 'salad', 'bowl', 'poke', 'acai', 'grain', 'quinoa',
    'vegan', 'vegetarian', 'plant-based', 'gluten-free', 'keto',
    'low carb', 'protein', 'lean', 'grilled', 'steamed', 'fresh'
  ],
  'Breakfast': [
    'breakfast', 'brunch', 'egg', 'omelette', 'omelet', 'bacon',
    'sausage', 'hash brown', 'cereal', 'toast', 'pancake', 'waffle',
    'french toast', 'benedict', 'scrambled', 'sunny side', 'poached'
  ],
  'Combo & Set': [
    'combo', 'set', 'meal', 'bundle', 'package', 'family', 'sharing',
    'platter', 'box', 'bucket', 'party pack', 'value meal'
  ],
};

// Modifier keywords that don't affect category
const MODIFIERS = [
  'special', 'original', 'classic', 'signature', 'premium', 'deluxe',
  'extra', 'large', 'medium', 'small', 'mini', 'jumbo', 'mega',
  'spicy', 'mild', 'hot', 'crispy', 'grilled', 'fried', 'baked',
  'fresh', 'homemade', 'house', 'chef', 'new', 'limited', 'best seller'
];

export interface CategorySuggestion {
  category: string;
  confidence: number;
  matchedKeywords: string[];
}

/**
 * Get category suggestions based on item name
 */
export function suggestCategories(itemName: string, limit: number = 3): CategorySuggestion[] {
  if (!itemName || itemName.trim().length === 0) {
    return [];
  }

  const normalizedName = itemName.toLowerCase().trim();
  const words = normalizedName.split(/\s+/);
  
  const suggestions: CategorySuggestion[] = [];

  for (const [category, keywords] of Object.entries(FOOD_CATEGORIES)) {
    const matchedKeywords: string[] = [];
    let score = 0;

    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      
      // Exact phrase match (highest score)
      if (normalizedName.includes(keywordLower)) {
        // Multi-word keyword match scores higher
        const keywordWords = keywordLower.split(/\s+/).length;
        score += keywordWords * 3;
        matchedKeywords.push(keyword);
        continue;
      }

      // Word boundary match
      for (const word of words) {
        if (word === keywordLower) {
          score += 2;
          if (!matchedKeywords.includes(keyword)) {
            matchedKeywords.push(keyword);
          }
        } else if (word.includes(keywordLower) || keywordLower.includes(word)) {
          // Partial match
          if (word.length >= 3 && keywordLower.length >= 3) {
            score += 1;
            if (!matchedKeywords.includes(keyword)) {
              matchedKeywords.push(keyword);
            }
          }
        }
      }
    }

    if (score > 0) {
      // Calculate confidence (0-100)
      const maxPossibleScore = keywords.length * 3;
      const confidence = Math.min(100, Math.round((score / Math.max(maxPossibleScore, 10)) * 100));
      
      suggestions.push({
        category,
        confidence,
        matchedKeywords,
      });
    }
  }

  // Sort by confidence and return top results
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}

/**
 * Get the best category match
 */
export function getBestCategory(itemName: string): string | null {
  const suggestions = suggestCategories(itemName, 1);
  return suggestions.length > 0 ? suggestions[0].category : null;
}

/**
 * Get all available categories
 */
export function getAllCategories(): string[] {
  return Object.keys(FOOD_CATEGORIES).sort();
}

/**
 * Check if a category exists
 */
export function categoryExists(category: string): boolean {
  return Object.keys(FOOD_CATEGORIES).some(
    cat => cat.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Get keywords for a category
 */
export function getCategoryKeywords(category: string): string[] {
  for (const [cat, keywords] of Object.entries(FOOD_CATEGORIES)) {
    if (cat.toLowerCase() === category.toLowerCase()) {
      return keywords;
    }
  }
  return [];
}

/**
 * Validate if item name matches a category
 */
export function validateCategory(itemName: string, category: string): boolean {
  const suggestions = suggestCategories(itemName);
  return suggestions.some(s => s.category.toLowerCase() === category.toLowerCase());
}

// ============== BATCH CATEGORY SUGGESTION ==============

export interface BatchItemInput {
  id: string | number;
  name: string;
  description?: string;
}

export interface BatchCategorySuggestion {
  itemId: string | number;
  itemName: string;
  suggestions: CategorySuggestion[];
  bestMatch: string | null;
}

/**
 * Suggest categories for multiple menu items at once
 * More efficient than calling suggestCategories repeatedly
 */
export function suggestCategoriesBatch(
  items: BatchItemInput[],
  limit: number = 3
): BatchCategorySuggestion[] {
  return items.map(item => {
    // Combine name and description for better matching
    const searchText = item.description 
      ? `${item.name} ${item.description}`
      : item.name;
    
    const suggestions = suggestCategories(searchText, limit);
    
    return {
      itemId: item.id,
      itemName: item.name,
      suggestions,
      bestMatch: suggestions.length > 0 ? suggestions[0].category : null,
    };
  });
}

/**
 * Get best category for multiple items efficiently
 */
export function getBestCategoriesBatch(
  items: BatchItemInput[]
): Map<string | number, string | null> {
  const results = new Map<string | number, string | null>();
  
  for (const item of items) {
    const best = getBestCategory(item.name);
    results.set(item.id, best);
  }
  
  return results;
}

/**
 * Auto-categorize items into groups
 * Returns items grouped by their best category match
 */
export function autoCategorizeItems(
  items: BatchItemInput[]
): Record<string, BatchItemInput[]> {
  const categorized: Record<string, BatchItemInput[]> = {
    'Uncategorized': [],
  };
  
  for (const item of items) {
    const best = getBestCategory(item.name);
    
    if (best) {
      if (!categorized[best]) {
        categorized[best] = [];
      }
      categorized[best].push(item);
    } else {
      categorized['Uncategorized'].push(item);
    }
  }
  
  // Remove empty Uncategorized if no items
  if (categorized['Uncategorized'].length === 0) {
    delete categorized['Uncategorized'];
  }
  
  return categorized;
}

/**
 * Analyze category distribution for a set of items
 */
export function analyzeCategoryDistribution(
  items: BatchItemInput[]
): {
  category: string;
  count: number;
  percentage: number;
  items: string[];
}[] {
  const categorized = autoCategorizeItems(items);
  const total = items.length;
  
  return Object.entries(categorized)
    .map(([category, categoryItems]) => ({
      category,
      count: categoryItems.length,
      percentage: Math.round((categoryItems.length / total) * 100),
      items: categoryItems.map(i => i.name),
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Suggest optimal menu structure based on items
 */
export function suggestMenuStructure(
  items: BatchItemInput[],
  minItemsPerCategory: number = 3
): {
  recommended: string[];
  optional: string[];
  itemAssignments: Map<string | number, string>;
} {
  const distribution = analyzeCategoryDistribution(items);
  const recommended: string[] = [];
  const optional: string[] = [];
  const itemAssignments = new Map<string | number, string>();
  
  for (const { category, count } of distribution) {
    if (count >= minItemsPerCategory) {
      recommended.push(category);
    } else if (count > 0 && category !== 'Uncategorized') {
      optional.push(category);
    }
  }
  
  // Assign items to categories
  for (const item of items) {
    const best = getBestCategory(item.name);
    if (best && (recommended.includes(best) || optional.includes(best))) {
      itemAssignments.set(item.id, best);
    }
  }
  
  return {
    recommended,
    optional,
    itemAssignments,
  };
}
