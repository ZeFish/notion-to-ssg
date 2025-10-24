/**
 * Client-side JavaScript for Notion Comments
 *
 * Provides progressive enhancement for the comment form:
 * - AJAX form submission
 * - Loading states
 * - Success/error messages
 * - Form validation
 *
 * Optional: The form works without JavaScript (standard POST)
 */

(function () {
  "use strict";

  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCommentForm);
  } else {
    initCommentForm();
  }

  function initCommentForm() {
    const forms = document.querySelectorAll(".notion-comment-form");

    forms.forEach((form) => {
      form.addEventListener("submit", handleFormSubmit);
    });
  }

  async function handleFormSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const submitButton = form.querySelector(".notion-comment-submit");
    const formData = new FormData(form);

    // Clear any existing messages
    clearMessages(form);

    // Validate form
    if (!validateForm(form)) {
      return;
    }

    // Disable submit button and show loading state
    submitButton.disabled = true;
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = "Submitting...";

    try {
      // Submit form via AJAX
      const response = await fetch(form.action, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Show success message
        showMessage(
          form,
          result.message || "Comment submitted successfully!",
          "success"
        );

        // Clear form
        form.reset();

        // Optionally reload comments (if you implement client-side refresh)
        // await refreshComments(form.dataset.pageId);
      } else {
        // Show error message
        showMessage(
          form,
          result.error || "Failed to submit comment. Please try again.",
          "error"
        );
      }
    } catch (error) {
      console.error("Error submitting comment:", error);
      showMessage(
        form,
        "Network error. Please check your connection and try again.",
        "error"
      );
    } finally {
      // Re-enable submit button
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }
  }

  function validateForm(form) {
    const author = form.querySelector("#comment-author");
    const email = form.querySelector("#comment-email");
    const content = form.querySelector("#comment-content");

    // Check required fields
    if (!author.value.trim()) {
      showMessage(form, "Please enter your name.", "error");
      author.focus();
      return false;
    }

    if (!email.value.trim()) {
      showMessage(form, "Please enter your email.", "error");
      email.focus();
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.value.trim())) {
      showMessage(form, "Please enter a valid email address.", "error");
      email.focus();
      return false;
    }

    if (!content.value.trim()) {
      showMessage(form, "Please enter your comment.", "error");
      content.focus();
      return false;
    }

    // Check max lengths
    if (author.value.length > 100) {
      showMessage(form, "Name is too long (max 100 characters).", "error");
      author.focus();
      return false;
    }

    if (content.value.length > 2000) {
      showMessage(form, "Comment is too long (max 2000 characters).", "error");
      content.focus();
      return false;
    }

    return true;
  }

  function showMessage(form, message, type) {
    const existingMessage = form.parentElement.querySelector(
      ".notion-comment-message"
    );
    if (existingMessage) {
      existingMessage.remove();
    }

    const messageEl = document.createElement("div");
    messageEl.className = `notion-comment-message notion-comment-${type}`;
    messageEl.textContent = message;
    messageEl.setAttribute("role", type === "error" ? "alert" : "status");

    form.parentElement.insertBefore(messageEl, form);

    // Auto-remove success messages after 5 seconds
    if (type === "success") {
      setTimeout(() => {
        messageEl.style.opacity = "0";
        setTimeout(() => messageEl.remove(), 300);
      }, 5000);
    }
  }

  function clearMessages(form) {
    const existingMessage = form.parentElement.querySelector(
      ".notion-comment-message"
    );
    if (existingMessage) {
      existingMessage.remove();
    }
  }

  // Optional: Function to refresh comments without page reload
  // async function refreshComments(pageId) {
  //   // You would need to implement a GET endpoint that returns just the comments HTML
  //   // For now, we'll just reload the page to show the new comment (if not moderated)
  //   setTimeout(() => {
  //     window.location.reload();
  //   }, 2000);
  // }
})();
