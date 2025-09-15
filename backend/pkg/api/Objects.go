package backend

type User struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	FirstName   string `json:"firstName"`
	LastName    string `json:"lastName"`
	DateOfBirth string `json:"dateOfBirth"`
	Nickname    string `json:"nickname"`
	AboutMe     string `json:"aboutMe"`
	Age         int    `json:"-"`
	Gender      string `json:"gender"`
	Url         string `json:"url"`
	AvatarUrl   string `json:"avatarUrl"`
	CreatedAt   string `json:"createdAt"`
}

type UserData struct {
	ID             string  `json:"id"`
	FirstName      string  `json:"firstName"`
	LastName       string  `json:"lastName"`
	Nickname       *string `json:"nickname,omitempty"`
	Email          string  `json:"email"`
	DateOfBirth    string  `json:"dateOfBirth"`
	Avatar         *string `json:"avatar,omitempty"`
	AboutMe        *string `json:"aboutMe,omitempty"`
	IsPrivate      bool    `json:"isPrivate"`
	FollowersCount int     `json:"followersCount"`
	FollowingCount int     `json:"followingCount"`
	PostsCount     int     `json:"postsCount"`
	JoinedDate     string  `json:"joinedDate"`
	Url            string  `json:"url"`
	Isfollowing    bool    `json:"isfollowing"`
}

type LoginUser struct {
	Identifier string `json:"identifier"`
	Password   string `json:"password"`
}

type Post struct {
	ID        int     `json:"id"`
	UserID    int     `json:"-"`
	Content   string  `json:"content"`
	Image     *string `json:"image,omitempty"`
	Privacy   string  `json:"privacy"`
	CreatedAt string  `json:"createdAt"`
	Likes     int     `json:"likes"`
	Comments  int     `json:"comments"`
	Shares    int     `json:"shares"`
	IsLiked   bool    `json:"isLiked"`
	Author    struct {
		Name      string `json:"name"`
		Username  string `json:"username"`
		Avatar    string `json:"avatar"`
		IsPrivate bool   `json:"isPrivate"` // بدل isVerified
	} `json:"author"`
}