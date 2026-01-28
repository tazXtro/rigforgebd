"""
URL configuration for builds app.
"""

from django.urls import path
from builds.views import (
    BuildsListView,
    BuildDetailView,
    FeaturedBuildsView,
    BuildVoteView,
    BuildCommentsView,
    CommentDetailView,
)

app_name = "builds"

urlpatterns = [
    # Builds
    path("", BuildsListView.as_view(), name="builds-list"),
    path("featured/", FeaturedBuildsView.as_view(), name="builds-featured"),
    path("<uuid:build_id>/", BuildDetailView.as_view(), name="build-detail"),
    
    # Voting
    path("<uuid:build_id>/vote/", BuildVoteView.as_view(), name="build-vote"),
    
    # Comments
    path("<uuid:build_id>/comments/", BuildCommentsView.as_view(), name="build-comments"),
    path("comments/<uuid:comment_id>/", CommentDetailView.as_view(), name="comment-detail"),
]
