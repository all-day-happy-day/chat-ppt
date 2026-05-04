export const en_US = {
  // Common
  'common.global.welcome': 'Welcome to ChatPPT',
  'common.global.back': 'Back',
  'common.global.save': 'Save',
  'common.user.username': 'Username',
  'common.user.email': 'Email',
  'common.user.password': 'Password',
  'common.user.change_password': 'Change Password',
  'common.auth.dont_have_an_account': "Don't have an account?",
  'common.auth.already_have_an_account': 'Already have an account?',
  'common.global.email_or_username': 'Email or Username',
  'common.global.password': 'Password',
  'common.global.sign_in': 'Sign In',
  'common.global.sign_up': 'Sign Up',
  'common.global.password_mismatch': 'Password does not match',
  'common.global.password_too_short': 'Password must be at least {{minLength}} characters',
  'common.global.wrong_password': 'Wrong password',
  'common.global.password_verified': 'Password verified',
  'common.global.new_password_verified': 'You can use this password',
  'common.global.new_password_confirmed': 'New password confirmed',
  'common.global.password_changed': 'Password changed successfully',
  'common.global.no_content': 'No content',
  'common.global.add': 'Add',
  'common.global.cancel': 'Cancel',

  // Home
  'home.profile': 'Profile',
  'home.projects': 'Projects',
  'home.templates': 'Templates',
  'home.songs': 'Songs',

  // Header
  'header.settings.settings': 'Settings',
  'header.settings.manage_users': 'Users Management',
  'header.settings.language': 'Language: {{language}}',
  'header.settings.theme': '{{theme}} theme',
  'header.settings.theme.toggle': 'Theme: {{theme}}',
  'header.settings.signout': 'Sign Out',
  'header.settings.theme.light': 'Light',
  'header.settings.theme.dark': 'Dark',
  'header.settings.theme.system': 'System',

  // GlobalErrorPage
  'page.global_error.title': 'Error Occurred',
  'page.global_error.description': 'An internal error has occurred. Please contact the administrator for support.',
  'page.global_error.reload_description': 'The page will reload in {{countdown}} seconds.',

  //NotFoundPage
  'page.not_found.title': 'Page Not Found',
  'page.not_found.description': 'The page you are looking for does not exist.',

  // Template edit
  'page.template_edit.back': 'Templates',
  'page.template_edit.title': 'Edit template',
  'page.template_edit.name_label': 'Template name',
  'page.template_edit.source_file_label': 'Uploaded file',
  'page.template_edit.layouts_heading': 'Layouts',
  'page.template_edit.no_layouts': 'No layouts in this template.',
  'page.template_edit.missing_id': 'Missing template id.',
  'page.template_edit.not_found': 'Template not found or you do not have access.',
  'page.template_edit.load_error': 'Failed to load templates.',
  'page.template_edit.layouts_error': 'Failed to load layouts.',

  // Template new
  'page.template_new.title': 'Add template',
  'page.template_new.name_label': 'Template name',
  'page.template_new.file_label': 'Template file (.pptx)',
  'page.template_new.error_generic': 'Could not upload template. Try again.',

  // Project view
  'page.project_view.back': 'Projects',
  'page.project_view.missing_id': 'Missing project id.',
  'page.project_view.not_found': 'Project not found or you do not have access.',
  'page.project_view.load_error': 'Failed to load projects.',
  'page.project_view.created': 'Created',
  'page.project_view.updated': 'Updated',
  'page.project_view.placeholder': 'Project workspace will be expanded here.',

  // Song
  'song.no_artist': 'No Artist',

  // Lists
  'list.name': 'Name',
  'list.username': 'Username',
  'list.created_at': 'Created at',
  'list.last_signin': 'Last sign-in',
  'list.updated_at': 'Updated At',
  'list.template_name': 'Template Name',
  'list.title': 'Title',
  'list.artist': 'Artist',
  'list.open_song_row': 'Open song to edit: {{title}}',
  'list.open_template_row': 'Open template to edit: {{name}}',
  'list.open_project_row': 'Open project: {{name}}',
} as const
