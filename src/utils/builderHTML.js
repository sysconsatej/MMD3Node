export const builderHTML = ({ tailwindCSS ,  htmlContent }) => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet" />
          <style>
            @page { margin: 10px; }
            body { font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
            ${tailwindCSS}
          </style>
        </head>
        <body>${htmlContent}</body>
      </html>
    `

    return html
}