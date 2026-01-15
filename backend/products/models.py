from django.db import models
from django.utils import timezone


class Category(models.Model):
    """Product category (e.g., GPU, CPU, RAM)"""
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)  # Icon name for frontend
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']

    def __str__(self):
        return self.name


class Retailer(models.Model):
    """Retailer information (e.g., Techland, Startech)"""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    website = models.URLField()
    logo = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(models.Model):
    """Base product model"""
    name = models.CharField(max_length=500)
    slug = models.SlugField(max_length=500, blank=True)
    brand = models.CharField(max_length=100, blank=True)
    model = models.CharField(max_length=200, blank=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name='products'
    )
    image = models.URLField(blank=True)
    description = models.TextField(blank=True)
    
    # Computed fields for quick access
    min_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    max_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def update_price_range(self):
        """Update min/max prices from retailer prices"""
        prices = self.prices.filter(
            is_available=True
        ).values_list('price', flat=True)
        
        if prices:
            self.min_price = min(prices)
            self.max_price = max(prices)
        else:
            self.min_price = None
            self.max_price = None
        self.save(update_fields=['min_price', 'max_price', 'updated_at'])


class ProductPrice(models.Model):
    """Price from a specific retailer"""
    AVAILABILITY_CHOICES = [
        ('in_stock', 'In Stock'),
        ('out_of_stock', 'Out of Stock'),
        ('pre_order', 'Pre-order'),
        ('upcoming', 'Upcoming'),
    ]

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='prices'
    )
    retailer = models.ForeignKey(
        Retailer,
        on_delete=models.CASCADE,
        related_name='product_prices'
    )
    price = models.DecimalField(max_digits=12, decimal_places=2)
    original_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    availability = models.CharField(
        max_length=20,
        choices=AVAILABILITY_CHOICES,
        default='in_stock'
    )
    product_url = models.URLField(max_length=1000)
    is_available = models.BooleanField(default=True)
    last_checked = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['product', 'retailer']
        ordering = ['price']

    def __str__(self):
        return f"{self.product.name} - {self.retailer.name}: ৳{self.price}"


class GPUSpecification(models.Model):
    """GPU-specific specifications"""
    product = models.OneToOneField(
        Product,
        on_delete=models.CASCADE,
        related_name='gpu_specs'
    )
    
    # Core specs
    chipset = models.CharField(max_length=100, blank=True)  # e.g., RTX 4090, RX 7900 XTX
    memory_size = models.CharField(max_length=20, blank=True)  # e.g., 24GB
    memory_type = models.CharField(max_length=20, blank=True)  # e.g., GDDR6X
    memory_bus = models.CharField(max_length=20, blank=True)  # e.g., 384-bit
    
    # Clock speeds
    base_clock = models.CharField(max_length=50, blank=True)  # e.g., 2235 MHz
    boost_clock = models.CharField(max_length=50, blank=True)  # e.g., 2520 MHz
    
    # Interface & Power
    interface = models.CharField(max_length=50, blank=True)  # e.g., PCIe 4.0 x16
    power_connector = models.CharField(max_length=100, blank=True)
    tdp = models.CharField(max_length=20, blank=True)  # e.g., 450W
    recommended_psu = models.CharField(max_length=20, blank=True)  # e.g., 850W
    
    # Outputs
    hdmi_ports = models.PositiveSmallIntegerField(null=True, blank=True)
    displayport_ports = models.PositiveSmallIntegerField(null=True, blank=True)
    
    # Physical
    length = models.CharField(max_length=30, blank=True)  # e.g., 336mm
    slots = models.CharField(max_length=10, blank=True)  # e.g., 3.5
    
    # Features (stored as JSON-compatible text)
    cuda_cores = models.CharField(max_length=20, blank=True)
    stream_processors = models.CharField(max_length=20, blank=True)
    ray_tracing = models.BooleanField(null=True, blank=True)
    dlss_support = models.BooleanField(null=True, blank=True)
    fsr_support = models.BooleanField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"GPU Specs: {self.product.name}"


class ScrapeLog(models.Model):
    """Log of scraping operations"""
    STATUS_CHOICES = [
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    retailer = models.ForeignKey(
        Retailer,
        on_delete=models.CASCADE,
        related_name='scrape_logs'
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name='scrape_logs',
        null=True,
        blank=True
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='running'
    )
    products_found = models.PositiveIntegerField(default=0)
    products_created = models.PositiveIntegerField(default=0)
    products_updated = models.PositiveIntegerField(default=0)
    errors = models.TextField(blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.retailer.name} - {self.started_at.strftime('%Y-%m-%d %H:%M')}"
