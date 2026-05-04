export const ko_KR = {
  // Common
  'common.global.welcome': 'ChatPPT에 오신 것을 환영합니다',
  'common.global.back': '뒤로가기',
  'common.global.save': '저장',
  'common.user.username': '사용자 이름',
  'common.user.email': '이메일',
  'common.user.password': '비밀번호',
  'common.user.change_password': '비밀번호 변경',
  'common.auth.dont_have_an_account': '계정이 없으신가요?',
  'common.auth.already_have_an_account': '이미 계정이 있으신가요?',
  'common.global.email_or_username': '이메일 또는 사용자 이름',
  'common.global.password': '비밀번호',
  'common.global.sign_in': '로그인',
  'common.global.sign_up': '회원가입',
  'common.global.password_mismatch': '비밀번호가 일치하지 않습니다',
  'common.global.password_too_short': '비밀번호는 {{minLength}}자 이상이어야 합니다',
  'common.global.wrong_password': '비밀번호가 일치하지 않습니다',
  'common.global.password_verified': '비밀번호가 일치합니다',
  'common.global.new_password_verified': '이 비밀번호를 사용할 수 있습니다',
  'common.global.new_password_confirmed': '새 비밀번호가 확인되었습니다',
  'common.global.password_changed': '비밀번호가 성공적으로 변경되었습니다',
  'common.global.no_content': '내용 없음',
  'common.global.add': '추가',
  'common.global.cancel': '취소',

  // Home
  'home.profile': '프로필',
  'home.projects': '프로젝트',
  'home.templates': '템플릿',
  'home.songs': '곡',

  // Header
  'header.settings.settings': '설정',
  'header.settings.manage_users': '사용자 관리',
  'header.settings.language': '언어: {{language}}',
  'header.settings.theme': '{{theme}} 테마',
  'header.settings.theme.toggle': '테마: {{theme}}',
  'header.settings.signout': '로그아웃',
  'header.settings.theme.light': '라이트',
  'header.settings.theme.dark': '다크',
  'header.settings.theme.system': '시스템',

  // GlobalErrorPage
  'page.global_error.title': '오류가 발생',
  'page.global_error.description': '내부 오류가 발생했습니다. 관리자에게 문의해주세요.',
  'page.global_error.reload_description': '{{countdown}}초 후 페이지가 자동으로 새로고침 됩니다.',

  // NotFoundPage
  'page.not_found.title': '페이지를 찾을 수 없습니다.',
  'page.not_found.description': '존재하지 않는 페이지입니다.',

  // Template edit
  'page.template_edit.back': '템플릿',
  'page.template_edit.title': '템플릿 편집',
  'page.template_edit.name_label': '템플릿 이름',
  'page.template_edit.source_file_label': '업로드 파일',
  'page.template_edit.layouts_heading': '레이아웃',
  'page.template_edit.no_layouts': '이 템플릿에 레이아웃이 없습니다.',
  'page.template_edit.missing_id': '템플릿 ID가 없습니다.',
  'page.template_edit.not_found': '템플릿을 찾을 수 없거나 접근 권한이 없습니다.',
  'page.template_edit.load_error': '템플릿 목록을 불러오지 못했습니다.',
  'page.template_edit.layouts_error': '레이아웃을 불러오지 못했습니다.',

  // Template new
  'page.template_new.title': '템플릿 추가',
  'page.template_new.name_label': '템플릿 이름',
  'page.template_new.file_label': '템플릿 파일 (.pptx)',
  'page.template_new.error_generic': '템플릿을 올리지 못했습니다. 다시 시도해 주세요.',

  // Project view
  'page.project_view.back': '프로젝트',
  'page.project_view.missing_id': '프로젝트 ID가 없습니다.',
  'page.project_view.not_found': '프로젝트를 찾을 수 없거나 접근 권한이 없습니다.',
  'page.project_view.load_error': '프로젝트 목록을 불러오지 못했습니다.',
  'page.project_view.created': '생성',
  'page.project_view.updated': '수정',
  'page.project_view.placeholder': '프로젝트 작업 화면은 이후에 확장됩니다.',

  // Song
  'song.no_artist': '아티스트 없음',

  // Lists
  'list.name': '이름',
  'list.username': '사용자 이름',
  'list.created_at': '생성 일시',
  'list.last_signin': '마지막 로그인',
  'list.updated_at': '수정 일시',
  'list.template_name': '템플릿 이름',
  'list.title': '제목',
  'list.artist': '아티스트',
  'list.open_song_row': '편집하려면 열기: {{title}}',
  'list.open_template_row': '템플릿 편집으로 열기: {{name}}',
  'list.open_project_row': '프로젝트 열기: {{name}}',
} as const
