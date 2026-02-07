"""
URL configuration for builds app.
"""

from django.urls import path
from builds.views import (
    BuildsListView,
    BuildDetailView,
    BuildsByProductView,
    FeaturedBuildsView,
    BuildVoteView,
    BuildCommentsView,
    CommentDetailView,
    UploadBuildImageView,
)

app_name = "builds"

urlpatterns = [
    # Builds
    path("", BuildsListView.as_view(), name="builds-list"),
    path("featured/", FeaturedBuildsView.as_view(), name="builds-featured"),
    path("by-product/", BuildsByProductView.as_view(), name="builds-by-product"),
    path("upload-image/", UploadBuildImageView.as_view(), name="upload-image"),
    path("<uuid:build_id>/", BuildDetailView.as_view(), name="build-detail"),
    
    # Voting
    path("<uuid:build_id>/vote/", BuildVoteView.as_view(), name="build-vote"),
    
    # Comments
    path("<uuid:build_id>/comments/", BuildCommentsView.as_view(), name="build-comments"),
    path("comments/<uuid:comment_id>/", CommentDetailView.as_view(), name="comment-detail"),
]
