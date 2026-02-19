import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function diagnoseAndFix() {
  try {
    console.log('🔍 Diagnosing product images...\n')

    // 1. Check total products
    const totalProducts = await prisma.product.count()
    console.log(`📦 Total products: ${totalProducts}`)

    // 2. Check products with images
    const productsWithImages = await prisma.product.findMany({
      where: {
        images: {
          some: {}
        }
      },
      select: {
        id: true,
        name: true,
        sku: true,
        images: {
          select: {
            id: true,
            url: true,
            isPrimary: true
          }
        }
      }
    })

    console.log(`\n🖼️  Products with images: ${productsWithImages.length}`)
    console.log('\nProducts with images:')
    productsWithImages.forEach(product => {
      console.log(`  - ${product.name} (${product.sku}): ${product.images.length} image(s)`)
      product.images.forEach(img => {
        console.log(`    → ${img.url.substring(0, 80)}... ${img.isPrimary ? '(PRIMARY)' : ''}`)
      })
    })

    // 3. Check products without images
    const productsWithoutImages = await prisma.product.findMany({
      where: {
        images: {
          none: {}
        }
      },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true
      }
    })

    console.log(`\n❌ Products without images: ${productsWithoutImages.length}`)
    if (productsWithoutImages.length > 0) {
      console.log('\nProducts missing images:')
      productsWithoutImages.slice(0, 10).forEach(product => {
        console.log(`  - ${product.name} (${product.sku}) - Stock: ${product.currentStock}`)
      })
      if (productsWithoutImages.length > 10) {
        console.log(`  ... and ${productsWithoutImages.length - 10} more`)
      }
    }

    // 4. Check ProductImage table directly
    const allImages = await prisma.productImage.findMany({
      select: {
        id: true,
        url: true,
        isPrimary: true,
        productId: true,
        product: {
          select: {
            name: true,
            sku: true
          }
        }
      }
    })

    console.log(`\n📸 Total product images in database: ${allImages.length}`)
    
    // 5. Check for orphaned images
    const orphanedImages = allImages.filter(img => !img.product)
    if (orphanedImages.length > 0) {
      console.log(`\n⚠️  Orphaned images (no product): ${orphanedImages.length}`)
    }

    // 6. Check for invalid URLs
    const invalidUrls = allImages.filter(img => {
      const url = img.url
      return !url.startsWith('http://') && !url.startsWith('https://')
    })

    if (invalidUrls.length > 0) {
      console.log(`\n⚠️  Images with invalid URLs: ${invalidUrls.length}`)
      invalidUrls.forEach(img => {
        console.log(`  - ${img.product?.name || 'Unknown'}: ${img.url.substring(0, 80)}...`)
      })
    }

    // 7. Test API endpoint simulation
    console.log('\n🔧 Simulating API response...')
    const apiTestProducts = await prisma.product.findMany({
      where: {},
      select: {
        id: true,
        name: true,
        sku: true,
        unitPrice: true,
        currentStock: true,
        unit: true,
        category: true,
        images: {
          take: 1,
          select: {
            url: true
          }
        },
        productCategory: {
          select: {
            id: true,
            name: true
          }
        }
      },
      take: 5
    })

    const transformedProducts = apiTestProducts.map(product => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      unitPrice: product.unitPrice,
      currentStock: product.currentStock,
      unit: product.unit,
      category: product.productCategory?.name || product.category,
      imageUrl: product.images?.[0]?.url || null
    }))

    console.log('\nSample API response (first 5 products):')
    transformedProducts.forEach(p => {
      console.log(`  - ${p.name}: imageUrl = ${p.imageUrl ? '✓ ' + p.imageUrl.substring(0, 60) + '...' : '❌ NULL'}`)
    })

    // 8. Check for failed syncs
    console.log('\n🔄 Checking IndexedDB for failed syncs...')
    console.log('   (This would require browser context - check browser DevTools > Application > IndexedDB)')

    console.log('\n' + '='.repeat(80))
    console.log('\n📊 SUMMARY:')
    console.log(`  • Total products: ${totalProducts}`)
    console.log(`  • Products with images: ${productsWithImages.length} (${Math.round(productsWithImages.length/totalProducts*100)}%)`)
    console.log(`  • Products without images: ${productsWithoutImages.length}`)
    console.log(`  • Total images in database: ${allImages.length}`)
    console.log(`  • Invalid URLs: ${invalidUrls.length}`)
    
    if (productsWithImages.length === 0) {
      console.log('\n❌ ISSUE: No products have images linked!')
      console.log('\n💡 POSSIBLE CAUSES:')
      console.log('  1. Images were uploaded but not linked to products')
      console.log('  2. ProductImage records exist but productId is NULL')
      console.log('  3. Images were uploaded to a different organization')
      console.log('  4. Product creation didn\'t include image linking')
    } else if (productsWithoutImages.length > productsWithImages.length) {
      console.log('\n⚠️  WARNING: Most products don\'t have images')
      console.log('  Consider adding images to products in the CRM')
    }

    console.log('\n✅ Diagnosis complete!')

  } catch (error) {
    console.error('❌ Error during diagnosis:', error)
  } finally {
    await prisma.$disconnect()
  }
}

diagnoseAndFix()
