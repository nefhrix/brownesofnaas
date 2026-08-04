# Brownes of Naas storefront

This project now includes:

- a static storefront website
- a public product catalogue page
- a product detail page
- a separate owner-only upload page
- a separate owner-only edit page
- a separate owner-only admin catalogue page
- a small Node + Express backend that stores product records and uploaded image paths

## Run locally

1. Install dependencies:
   npm install

2. Start the server:
   npm start

3. Open the public site at:
   http://localhost:3000/brownes-of-naas.html

4. Public product catalogue:
   http://localhost:3000/all-products.html

5. Owner upload page:
   http://localhost:3000/product-upload.html

6. Owner edit page:
   http://localhost:3000/product-edit.html?id=tailored-suit

7. Owner admin catalogue page:
   http://localhost:3000/admin-products.html

## Admin login

Default owner login:
- username: owner
- password: owner123

For a hosted deployment, set the environment variables:
- ADMIN_PASSWORD
- SESSION_SECRET
