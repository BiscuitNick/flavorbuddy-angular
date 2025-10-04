const API_URL = 'https://python-flask-0ni5.onrender.com';

export const environment = {
  production: true,
  apiUrl: API_URL,
  apiPath: `${API_URL}/parse-recipe-url`,
  recipesPath: `${API_URL}/get-recipes`,
  recipeByIdPath: `${API_URL}/get-recipe-by-id`,
  favoritedRecipesPath: `${API_URL}/get-favorited-recipes`,
  relatedRecipesPath: `${API_URL}/get-related-recipes`,
  convertRawRecipePath: `${API_URL}/convert-raw-recipe`,
  likeRecipePath: `${API_URL}/like-recipe`,
  dislikeRecipePath: `${API_URL}/dislike-recipe`,
  favoriteRecipePath: `${API_URL}/favorite-recipe`,
  deleteRecipePath: `${API_URL}/delete-recipe`
};
