import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkProductImages() {
  try {
    console.log('Checking products and their images...\n')
    
    // Get organization count
    const orgCount = await prisma.organization.count()
    console.log(`Total organizations: ${orgCount}`)
    
    // Get products with images
    const productsWithImages = await prisma.product.findMany({
      include: {
        images: true,
        organization: {
          select: { name: true, id: true }
        }
      },
      take: 20
    })
    
    console.log(`\nTotal products checked: ${productsWithImages.length}\n`)
    
    productsWithImages.forEach((product, index) => {
      console.log(`${index + 1}. Product: ${product.name}`)
      console.log(`   Organization: ${product.organization.name} (${product.organization.id})`)
      console.log(`   SKU: ${product.sku || 'N/A'}`)
      console.log(`   Category: ${product.category}`)
      console.log(`   Images: ${product.images.length}`)
      if (product.images.length > 0) {
        product.images.forEach((img, imgIndex) => {
          console.log(`      ${imgIndex + 1}. ${img.url}`)
          console.log(`         Primary: ${img.isPrimary}, Order: ${img.order}`)
        })
      } else {
        console.log('      ❌ No images found')
      }
      console.log('')
    })
    
    // Count products with and without images
    const productsWithImageCount = productsWithImages.filter(p => p.images.length > 0).length
    const productsWithoutImageCount = productsWithImages.filter(p => p.images.length === 0).length
    
    console.log('\n=== Summary ===')
    console.log(`Products with images: ${productsWithImageCount}`)
    console.log(`Products without images: ${productsWithoutImageCount}`)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkProductImages()
