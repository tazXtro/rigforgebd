"""
URL configuration for rigadmin app.
"""

from django.urls import path
from rigadmin.views import (
    AdminCheckView,
    AdminMeView,
    InviteListCreateView,
    InviteValidateView,
    InviteAcceptView,
    PendingBuildsView,
    PendingBuildsCountView,
    BuildApproveView,
    BuildRejectView,
    AllCommentsView,
    SanctionsView,
    SanctionDetailView,
    CheckUserSanctionView,
)
from rigadmin.product_views import (
    AdminProductCreateView,
    AdminProductUpdateView,
    AdminProductSpecsView,
    AdminProductPriceListCreateView,
    AdminProductPriceUpdateView,
)

app_name = "rigadmin"

urlpatterns = [
    # Admin authentication
    path("check/", AdminCheckView.as_view(), name="admin-check"),
    path("me/", AdminMeView.as_view(), name="admin-me"),
    
    # Invites
    path("invites/", InviteListCreateView.as_view(), name="invite-list-create"),
    path("invites/validate/", InviteValidateView.as_view(), name="invite-validate"),
    path("invites/accept/", InviteAcceptView.as_view(), name="invite-accept"),
    
    # Build moderation
    path("builds/pending/", PendingBuildsView.as_view(), name="pending-builds"),
    path("builds/pending/count/", PendingBuildsCountView.as_view(), name="pending-builds-count"),
    path("builds/<str:build_id>/approve/", BuildApproveView.as_view(), name="approve-build"),
    path("builds/<str:build_id>/reject/", BuildRejectView.as_view(), name="reject-build"),
    
    # User moderation
    path("comments/", AllCommentsView.as_view(), name="all-comments"),
    path("sanctions/", SanctionsView.as_view(), name="sanctions"),
    path("sanctions/<str:sanction_id>/", SanctionDetailView.as_view(), name="sanction-detail"),
    path("sanctions/check/<str:user_id>/", CheckUserSanctionView.as_view(), name="check-user-sanction"),
    
    # Admin product management
    path("products/", AdminProductCreateView.as_view(), name="admin-product-create"),
    path("products/<str:product_id>/", AdminProductUpdateView.as_view(), name="admin-product-update"),
    path("products/<str:product_id>/specs/", AdminProductSpecsView.as_view(), name="admin-product-specs"),
    path("products/<str:product_id>/prices/", AdminProductPriceListCreateView.as_view(), name="admin-product-prices"),
    path("products/<str:product_id>/prices/<str:price_id>/", AdminProductPriceUpdateView.as_view(), name="admin-product-price-update"),
]

