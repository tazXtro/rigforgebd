import { Product } from "./ProductCard"

// Bangladesh retailers
const retailers = [
    { name: "Star Tech", slug: "startech" },
    { name: "Techland BD", slug: "techland" },
    { name: "Ryans Computers", slug: "ryans" },
    { name: "UltraTech", slug: "ultratech" },
    { name: "Skyland", slug: "skyland" },
    { name: "Nexus Computer", slug: "nexus" },
]

// Helper to generate random prices
const randomPrice = (base: number, variance: number = 0.15) => {
    const min = base * (1 - variance)
    const max = base * (1 + variance)
    return Math.round((Math.random() * (max - min) + min) / 100) * 100
}

// Helper to pick random retailers with prices
const generateRetailers = (basePrice: number, count: number = 3) => {
    const shuffled = [...retailers].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count).map((r) => ({
        name: r.name,
        price: randomPrice(basePrice),
        inStock: Math.random() > 0.2,
        url: `https://${r.slug}.com.bd`,
    }))
}

// Mock product data
export const mockProducts: Product[] = [
    // Processors
    {
        id: "cpu-1",
        name: "AMD Ryzen 9 9900X 12-Core 24-Thread Desktop Processor",
        slug: "amd-ryzen-9-9900x",
        category: "Processors",
        categorySlug: "processors",
        image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop",
        brand: "AMD",
        retailers: generateRetailers(75000),
        specs: { cores: "12", threads: "24", baseClock: "4.4 GHz", boostClock: "5.6 GHz" },
    },
    {
        id: "cpu-2",
        name: "AMD Ryzen 7 9700X 8-Core 16-Thread Desktop Processor",
        slug: "amd-ryzen-7-9700x",
        category: "Processors",
        categorySlug: "processors",
        image: "https://images.unsplash.com/photo-1555617981-dac3880eac6e?w=400&h=400&fit=crop",
        brand: "AMD",
        retailers: generateRetailers(52000),
        specs: { cores: "8", threads: "16", baseClock: "3.8 GHz", boostClock: "5.5 GHz" },
    },
    {
        id: "cpu-3",
        name: "Intel Core i9-14900K 24-Core Desktop Processor",
        slug: "intel-core-i9-14900k",
        category: "Processors",
        categorySlug: "processors",
        image: "https://images.unsplash.com/photo-1555617766-df7dda0e8e6e?w=400&h=400&fit=crop",
        brand: "Intel",
        retailers: generateRetailers(82000),
        specs: { cores: "24", threads: "32", baseClock: "3.2 GHz", boostClock: "6.0 GHz" },
    },
    {
        id: "cpu-4",
        name: "Intel Core i7-14700K 20-Core Desktop Processor",
        slug: "intel-core-i7-14700k",
        category: "Processors",
        categorySlug: "processors",
        image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=400&fit=crop",
        brand: "Intel",
        retailers: generateRetailers(58000),
    },
    {
        id: "cpu-5",
        name: "AMD Ryzen 5 7600X 6-Core Desktop Processor",
        slug: "amd-ryzen-5-7600x",
        category: "Processors",
        categorySlug: "processors",
        image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop",
        brand: "AMD",
        retailers: generateRetailers(28000),
    },

    // Graphics Cards
    {
        id: "gpu-1",
        name: "NVIDIA GeForce RTX 5090 Founders Edition 24GB GDDR7",
        slug: "nvidia-rtx-5090-fe",
        category: "Graphics Cards",
        categorySlug: "graphics-cards",
        image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&h=400&fit=crop",
        brand: "NVIDIA",
        retailers: generateRetailers(350000),
    },
    {
        id: "gpu-2",
        name: "ASUS ROG Strix GeForce RTX 4080 SUPER OC 16GB",
        slug: "asus-rog-rtx-4080-super",
        category: "Graphics Cards",
        categorySlug: "graphics-cards",
        image: "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=400&fit=crop",
        brand: "ASUS",
        retailers: generateRetailers(185000),
    },
    {
        id: "gpu-3",
        name: "MSI GeForce RTX 4070 Ti SUPER Gaming X Trio 16GB",
        slug: "msi-rtx-4070-ti-super",
        category: "Graphics Cards",
        categorySlug: "graphics-cards",
        image: "https://images.unsplash.com/photo-1622957461429-5ea04e1e1a1c?w=400&h=400&fit=crop",
        brand: "MSI",
        retailers: generateRetailers(125000),
    },
    {
        id: "gpu-4",
        name: "Gigabyte GeForce RTX 4060 Ti Eagle OC 8GB",
        slug: "gigabyte-rtx-4060-ti",
        category: "Graphics Cards",
        categorySlug: "graphics-cards",
        image: "https://images.unsplash.com/photo-1600348712270-545f1b17eb32?w=400&h=400&fit=crop",
        brand: "Gigabyte",
        retailers: generateRetailers(65000),
    },
    {
        id: "gpu-5",
        name: "AMD Radeon RX 7900 XTX 24GB GDDR6",
        slug: "amd-rx-7900-xtx",
        category: "Graphics Cards",
        categorySlug: "graphics-cards",
        image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&h=400&fit=crop",
        brand: "AMD",
        retailers: generateRetailers(165000),
    },

    // Motherboards
    {
        id: "mobo-1",
        name: "ASUS ROG Crosshair X870E Hero AM5 DDR5 Motherboard",
        slug: "asus-rog-crosshair-x870e",
        category: "Motherboards",
        categorySlug: "motherboards",
        image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=400&fit=crop",
        brand: "ASUS",
        retailers: generateRetailers(85000),
    },
    {
        id: "mobo-2",
        name: "MSI MAG B650 Tomahawk WiFi DDR5 Motherboard",
        slug: "msi-mag-b650-tomahawk",
        category: "Motherboards",
        categorySlug: "motherboards",
        image: "https://images.unsplash.com/photo-1555617766-df7dda0e8e6e?w=400&h=400&fit=crop",
        brand: "MSI",
        retailers: generateRetailers(32000),
    },
    {
        id: "mobo-3",
        name: "Gigabyte Z790 AORUS Master DDR5 LGA1700 Motherboard",
        slug: "gigabyte-z790-aorus-master",
        category: "Motherboards",
        categorySlug: "motherboards",
        image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop",
        brand: "Gigabyte",
        retailers: generateRetailers(72000),
    },

    // Memory
    {
        id: "ram-1",
        name: "G.Skill Trident Z5 RGB DDR5-6400 32GB (2x16GB) CL32",
        slug: "gskill-trident-z5-ddr5-6400",
        category: "Memory",
        categorySlug: "memory",
        image: "https://images.unsplash.com/photo-1562976540-1502c2145186?w=400&h=400&fit=crop",
        brand: "G.Skill",
        retailers: generateRetailers(22000),
    },
    {
        id: "ram-2",
        name: "Corsair Dominator Platinum RGB DDR5-6000 32GB (2x16GB)",
        slug: "corsair-dominator-ddr5-6000",
        category: "Memory",
        categorySlug: "memory",
        image: "https://images.unsplash.com/photo-1541029071515-84cc54f84dc5?w=400&h=400&fit=crop",
        brand: "Corsair",
        retailers: generateRetailers(28000),
    },
    {
        id: "ram-3",
        name: "Kingston FURY Beast DDR5-5600 32GB (2x16GB) Black",
        slug: "kingston-fury-beast-ddr5",
        category: "Memory",
        categorySlug: "memory",
        image: "https://images.unsplash.com/photo-1562976540-1502c2145186?w=400&h=400&fit=crop",
        brand: "Kingston",
        retailers: generateRetailers(15000),
    },

    // Storage
    {
        id: "storage-1",
        name: "Samsung 990 Pro 2TB NVMe PCIe 4.0 M.2 SSD",
        slug: "samsung-990-pro-2tb",
        category: "Storage",
        categorySlug: "storage",
        image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&h=400&fit=crop",
        brand: "Samsung",
        retailers: generateRetailers(28000),
    },
    {
        id: "storage-2",
        name: "WD Black SN850X 1TB NVMe PCIe 4.0 M.2 SSD",
        slug: "wd-black-sn850x-1tb",
        category: "Storage",
        categorySlug: "storage",
        image: "https://images.unsplash.com/photo-1628557044797-f21d7d44f3eb?w=400&h=400&fit=crop",
        brand: "Western Digital",
        retailers: generateRetailers(16000),
    },
    {
        id: "storage-3",
        name: "Crucial T700 2TB PCIe Gen5 NVMe M.2 SSD",
        slug: "crucial-t700-2tb",
        category: "Storage",
        categorySlug: "storage",
        image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&h=400&fit=crop",
        brand: "Crucial",
        retailers: generateRetailers(42000),
    },

    // Power Supply
    {
        id: "psu-1",
        name: "Corsair RM1000x 1000W 80+ Gold Fully Modular PSU",
        slug: "corsair-rm1000x",
        category: "Power Supply",
        categorySlug: "power-supply",
        image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&h=400&fit=crop",
        brand: "Corsair",
        retailers: generateRetailers(22000),
    },
    {
        id: "psu-2",
        name: "Seasonic PRIME TX-1000 1000W 80+ Titanium PSU",
        slug: "seasonic-prime-tx-1000",
        category: "Power Supply",
        categorySlug: "power-supply",
        image: "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=400&fit=crop",
        brand: "Seasonic",
        retailers: generateRetailers(38000),
    },

    // Cases
    {
        id: "case-1",
        name: "Lian Li O11 Dynamic EVO XL Full Tower Case",
        slug: "lian-li-o11-evo-xl",
        category: "Cases",
        categorySlug: "cases",
        image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&h=400&fit=crop",
        brand: "Lian Li",
        retailers: generateRetailers(32000),
    },
    {
        id: "case-2",
        name: "NZXT H7 Elite ATX Mid Tower Case White",
        slug: "nzxt-h7-elite",
        category: "Cases",
        categorySlug: "cases",
        image: "https://images.unsplash.com/photo-1600348712270-545f1b17eb32?w=400&h=400&fit=crop",
        brand: "NZXT",
        retailers: generateRetailers(28000),
    },

    // Cooling
    {
        id: "cooling-1",
        name: "NZXT Kraken Z73 RGB 360mm AIO Liquid Cooler",
        slug: "nzxt-kraken-z73",
        category: "Cooling",
        categorySlug: "cooling",
        image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&h=400&fit=crop",
        brand: "NZXT",
        retailers: generateRetailers(35000),
    },
    {
        id: "cooling-2",
        name: "Noctua NH-D15 chromax.black CPU Air Cooler",
        slug: "noctua-nh-d15-chromax",
        category: "Cooling",
        categorySlug: "cooling",
        image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=400&fit=crop",
        brand: "Noctua",
        retailers: generateRetailers(16000),
    },

    // Monitors
    {
        id: "monitor-1",
        name: "ASUS ROG Swift PG32UCDM 32\" 4K 240Hz OLED Monitor",
        slug: "asus-rog-swift-pg32ucdm",
        category: "Monitors",
        categorySlug: "monitors",
        image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=400&fit=crop",
        brand: "ASUS",
        retailers: generateRetailers(185000),
    },
    {
        id: "monitor-2",
        name: "LG UltraGear 27GP950-B 27\" 4K 160Hz Nano IPS",
        slug: "lg-ultragear-27gp950",
        category: "Monitors",
        categorySlug: "monitors",
        image: "https://images.unsplash.com/photo-1585790050106-7ab7ac0b35d5?w=400&h=400&fit=crop",
        brand: "LG",
        retailers: generateRetailers(95000),
    },
    {
        id: "monitor-3",
        name: "Samsung Odyssey G9 49\" DQHD 240Hz Curved Monitor",
        slug: "samsung-odyssey-g9",
        category: "Monitors",
        categorySlug: "monitors",
        image: "https://images.unsplash.com/photo-1527443195645-1133f7f28990?w=400&h=400&fit=crop",
        brand: "Samsung",
        retailers: generateRetailers(175000),
    },

    // Accessories
    {
        id: "acc-1",
        name: "Logitech G Pro X Superlight 2 Wireless Gaming Mouse",
        slug: "logitech-g-pro-superlight-2",
        category: "Accessories",
        categorySlug: "accessories",
        image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=400&fit=crop",
        brand: "Logitech",
        retailers: generateRetailers(18000),
    },
    {
        id: "acc-2",
        name: "SteelSeries Apex Pro TKL Wireless Keyboard",
        slug: "steelseries-apex-pro-tkl",
        category: "Accessories",
        categorySlug: "accessories",
        image: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400&h=400&fit=crop",
        brand: "SteelSeries",
        retailers: generateRetailers(32000),
    },

    // Laptops
    {
        id: "laptop-1",
        name: "ASUS ROG Zephyrus G16 RTX 4090 Gaming Laptop",
        slug: "asus-rog-zephyrus-g16",
        category: "Laptops",
        categorySlug: "laptops",
        image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop",
        brand: "ASUS",
        retailers: generateRetailers(385000),
    },
    {
        id: "laptop-2",
        name: "MSI Titan 18 HX RTX 4090 Gaming Laptop",
        slug: "msi-titan-18-hx",
        category: "Laptops",
        categorySlug: "laptops",
        image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=400&fit=crop",
        brand: "MSI",
        retailers: generateRetailers(520000),
    },

    // Pre-builts
    {
        id: "prebuilt-1",
        name: "RigForgeBD Elite Gaming PC - RTX 4080 / Ryzen 9",
        slug: "rigforgebd-elite-gaming-pc",
        category: "Pre-builts",
        categorySlug: "pre-builts",
        image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&h=400&fit=crop",
        brand: "RigForgeBD",
        retailers: generateRetailers(285000, 2),
    },
    {
        id: "prebuilt-2",
        name: "RigForgeBD Pro Workstation - RTX 4090 / i9-14900K",
        slug: "rigforgebd-pro-workstation",
        category: "Pre-builts",
        categorySlug: "pre-builts",
        image: "https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=400&h=400&fit=crop",
        brand: "RigForgeBD",
        retailers: generateRetailers(425000, 2),
    },
]

// Helper to filter products
export function filterProducts(
    products: Product[],
    filters: {
        search?: string
        category?: string
        brands?: string[]
        retailers?: string[]
        minPrice?: number
        maxPrice?: number
        inStock?: boolean
    }
): Product[] {
    return products.filter((product) => {
        // Search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase()
            const matchesSearch =
                product.name.toLowerCase().includes(searchLower) ||
                product.brand.toLowerCase().includes(searchLower) ||
                product.category.toLowerCase().includes(searchLower)
            if (!matchesSearch) return false
        }

        // Category filter
        if (filters.category && product.categorySlug !== filters.category) {
            return false
        }

        // Brand filter
        if (filters.brands && filters.brands.length > 0) {
            const brandLower = product.brand.toLowerCase().replace(/\s+/g, "-")
            if (!filters.brands.some((b) => brandLower.includes(b))) {
                return false
            }
        }

        // Retailer filter
        if (filters.retailers && filters.retailers.length > 0) {
            const productRetailers = product.retailers.map((r) =>
                r.name.toLowerCase().replace(/\s+/g, "")
            )
            if (!filters.retailers.some((r) => productRetailers.some((pr) => pr.includes(r)))) {
                return false
            }
        }

        // Price filter
        const lowestPrice = Math.min(...product.retailers.map((r) => r.price))
        if (filters.minPrice && lowestPrice < filters.minPrice) {
            return false
        }
        if (filters.maxPrice && lowestPrice > filters.maxPrice) {
            return false
        }

        // Stock filter
        if (filters.inStock) {
            const hasStock = product.retailers.some((r) => r.inStock)
            if (!hasStock) return false
        }

        return true
    })
}

// Helper to sort products
export function sortProducts(
    products: Product[],
    sortBy: string
): Product[] {
    const sorted = [...products]

    switch (sortBy) {
        case "price_asc":
            sorted.sort((a, b) => {
                const priceA = Math.min(...a.retailers.map((r) => r.price))
                const priceB = Math.min(...b.retailers.map((r) => r.price))
                return priceA - priceB
            })
            break
        case "price_desc":
            sorted.sort((a, b) => {
                const priceA = Math.min(...a.retailers.map((r) => r.price))
                const priceB = Math.min(...b.retailers.map((r) => r.price))
                return priceB - priceA
            })
            break
        case "name_asc":
            sorted.sort((a, b) => a.name.localeCompare(b.name))
            break
        case "name_desc":
            sorted.sort((a, b) => b.name.localeCompare(a.name))
            break
        default:
            // Default: keep original order (newest)
            break
    }

    return sorted
}
