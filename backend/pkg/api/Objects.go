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
}


type LoginUser struct {
	Identifier string `json:"identifier"`
	Password   string `json:"password"`
}
