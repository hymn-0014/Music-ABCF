# How to Add the Logo Images

The app is now configured to display logos in two places:

1. **Home Screen** - Shows both logos at the top
2. **App Header** - Shows the Music Ministry logo in the navigation header

## Step 1: Save the Images

Save the logo images you provided to the following location:

**Directory**: `/public/assets/logos/`

**Required files**:
- `bible-logo.png` - The Bible/hymn book icon (green with red cross)
- `music-ministry-logo.png` - The Music Ministry logo (musical note design)

## Step 2: Image Specifications

### Bible Logo (bible-logo.png)
- **Dimensions**: 60×60px (or maintain aspect ratio)
- **Format**: PNG with transparency
- **Location**: `/public/assets/logos/bible-logo.png`
- **Usage**: Displayed on the Home Screen alongside the Music Ministry logo

### Music Ministry Logo (music-ministry-logo.png)
- **Dimensions**: 100×40px or 120×30px (maintain aspect ratio)
- **Format**: PNG with transparency
- **Location**: `/public/assets/logos/music-ministry-logo.png`
- **Usage**: Displayed on Home Screen and in the app header navigation

## Step 3: Verify Installation

After saving the images:

1. Run the app: `npm run web` (for web) or `npm start` (for mobile)
2. Check that:
   - The Home Screen displays both logos at the top
   - The app header shows the Music Ministry logo
   - The logos are properly sized and centered

## Notes

- The app automatically handles both web and mobile platforms
- On web, images are loaded from `/assets/logos/`
- On mobile (iOS/Android), images are bundled from the public directory
- PNG format with transparency is recommended for best appearance
- You can adjust logo sizes in the styles if needed:
  - `bibleLogo` style: width/height
  - `musicLogo` style: width/height
