<template>
  <!-- Vuetify 상단 앱바 -->
  <v-app-bar app dense color="white" class="elevation-1">
    <!-- 좌/우 컴포넌트를 space-between 으로 배치 -->
    <div class="d-flex align-center justify-space-between flex-grow-1">
      <!-- 좌측: 로고 (메인 이동) -->
      <div class="d-flex align-center">
        <v-btn text class="pa-0" height="auto" @click="goHome">
          <h1 class="text-h6 font-weight-bold mb-0">
            EssetStore
          </h1>
        </v-btn>
      </div>

      <!-- 우측: 검색바 + 에셋추가 + 관리자 기능 (하나의 그룹) -->
      <div class="d-flex align-center">
        <!-- 검색바 -->
        <v-text-field v-model="search" hide-details dense solo-inverted flat prepend-inner-icon="mdi-magnify"
          placeholder="파일명 검색" class="mr-2" @keyup.enter="onSearch" />

        <!-- 에셋 추가 버튼: /upload -->
        <v-btn color="primary" class="mr-2" @click="goUpload">
          에셋추가
        </v-btn>

        <!-- 관리자 기능 버튼: /settings -->
        <v-btn outlined color="primary" @click="goSettings">
          관리자 기능
        </v-btn>
      </div>
    </div>
  </v-app-bar>
</template>

<script>
export default {
  name: 'Header',

  data() {
    return {
      // 검색어 상태
      search: ''
    }
  },

  methods: {
    /**
     * @function goHome
     * @description 로고 클릭 시 메인 페이지(/)로 이동한다.
     */
    goHome() {
      this.$router.push('/')
    },

    /**
     * @function goUpload
     * @description 에셋추가 버튼 클릭 시 업로드 페이지(/upload)로 이동한다.
     */
    goUpload() {
      this.$router.push('/upload')
    },

    /**
     * @function goSettings
     * @description 관리자 기능 버튼 클릭 시 설정 페이지(/settings)로 이동한다.
     */
    goSettings() {
      this.$router.push('/settings')
    },

    /**
     * @function onSearch
     * @description
     *  - 검색어 입력 후 Enter 시 호출된다.
     *  - 메인 페이지(/)로 이동하면서 쿼리스트링에 filename을 전달한다.
     *  - 검색어가 비어 있으면 전체 목록을 보기 위해 쿼리 없이 / 만 호출한다.
     */
    onSearch() {
      const keyword = (this.search || '').trim()

      if (!keyword) {
        // 검색어가 없으면 전체 목록
        this.$router.push({ path: '/' })
        return
      }

      this.$router.push({
        path: '/',
        query: {
          filename: keyword
        }
      })
    }
  }
}
</script>
