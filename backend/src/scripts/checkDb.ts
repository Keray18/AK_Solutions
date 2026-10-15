import { db } from '../config/database.js';
import { brands, products } from '../db/schema/products.js';
import { ingredients, ingredientInteractions } from '../db/schema/ingredients.js';
import { users } from '../db/schema/users.js';
import { routines } from '../db/schema/routines.js';
import { recommendations } from '../db/schema/recommendations.js';

async function main() {
  const brandList = await db.select().from(brands);
  const productList = await db.select().from(products);
  const ingredientList = await db.select().from(ingredients);
  const interactionList = await db.select().from(ingredientInteractions);
  const userList = await db.select().from(users);
  const routineList = await db.select().from(routines);
  const recList = await db.select().from(recommendations);

  console.log('Current DB state:');
  console.log('- Brands:', brandList.length);
  console.log('- Products:', productList.length);
  console.log('- Ingredients:', ingredientList.length);
  console.log('- Interactions:', interactionList.length);
  console.log('- Users:', userList.length);
  console.log('- Routines:', routineList.length);
  console.log('- Recommendations:', recList.length);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
