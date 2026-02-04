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
)

app_name = "rigadmin"

urlpatterns = [
    path("check/", AdminCheckView.as_view(), name="admin-check"),
    path("me/", AdminMeView.as_view(), name="admin-me"),
    path("invites/", InviteListCreateView.as_view(), name="invite-list-create"),
    path("invites/validate/", InviteValidateView.as_view(), name="invite-validate"),
    path("invites/accept/", InviteAcceptView.as_view(), name="invite-accept"),
]
