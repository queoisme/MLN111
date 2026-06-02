'use strict';

const FACTIONS = {
  proletariat: {
    id: 'proletariat',
    name: 'Vô Sản',
    subtitle: 'Liên minh Công nhân & Công đoàn',
    color: '#e63946',
    colorDim: '#7a1a20',
    description: 'Bảo vệ trụ sở công đoàn và khu lao động khỏi đàn áp, chia rẽ nội bộ và đói nghèo. Sức mạnh nằm ở đoàn kết tập thể.',
    startStats: { morale: 80, capital: 35, control: 30, legitimacy: 60 },
    loseConditions: { morale: 0, capital: 0 },
    loseTexts: {
      morale: 'Tinh thần tập thể sụp đổ. Công nhân phân tán, tổ chức tan rã — áp bức tiếp tục không gì cản trở.',
      capital: 'Cạn kiệt nguồn lực. Không còn khả năng tổ chức hay kháng cự. Giai cấp tư sản giành chiến thắng mà không cần đánh một trận.'
    },
    winText: 'Bảy ngày kiên trì. Tổ chức công đoàn đứng vững trước mọi sóng gió — một bước nhỏ trong cuộc đấu tranh dài.',
    actions: ['organize', 'strike_fund', 'barricade', 'mass_rally', 'negotiate',
              'mutual_aid', 'fundraise', 'underground_press', 'solidarity_network', 'general_strike_threat']
  },
  bourgeoisie: {
    id: 'bourgeoisie',
    name: 'Tư Sản',
    subtitle: 'Liên minh Chủ xưởng & Tư bản',
    color: '#f4a261',
    colorDim: '#7a4a1a',
    description: 'Bảo vệ dây chuyền sản xuất, kho hàng và ảnh hưởng chính trị khỏi đình công, tẩy chay và phá hoại. Sức mạnh nằm ở vốn.',
    startStats: { morale: 40, capital: 80, control: 70, legitimacy: 50 },
    loseConditions: { capital: 0, legitimacy: 0 },
    loseTexts: {
      capital: 'Phá sản. Dây chuyền sản xuất tê liệt, vốn đầu tư tháo chạy — đế chế kinh tế sụp đổ từ bên trong.',
      legitimacy: 'Uy tín cạn kiệt. Chính quyền quay lưng, người tiêu dùng tẩy chay — quyền lực mà không có chính danh là bạo ngược.'
    },
    winText: 'Bảy ngày giữ vững. Lợi nhuận tiếp tục chảy, trật tự được duy trì — ít nhất là cho đến lần sau.',
    actions: ['hire_security', 'media_campaign', 'lockout', 'bribe_officials', 'automate',
              'legal_pressure', 'propaganda_blitz', 'emergency_decree', 'political_deal', 'infiltrate']
  }
};

const ACTIONS = {
  // ── Proletariat ──────────────────────────────────────────
  organize: {
    id: 'organize', name: 'Tổ Chức Công Nhân', icon: '✊',
    cost: { capital: 5 }, effect: { morale: 10, legitimacy: 5 },
    description: 'Chi 5 vốn. Tinh thần +10, chính danh +5.',
    flavorText: 'Mỗi cuộc họp tổ bào là một mắt xích trong chuỗi đoàn kết không ai bứt được.',
    availableFrom: 1
  },
  strike_fund: {
    id: 'strike_fund', name: 'Quỹ Đình Công', icon: '💰',
    cost: { capital: 15 }, effect: {},
    buff: { type: 'reduce_wave_strike', reduction: 0.35, turns: 1 },
    description: 'Chi 15 vốn. Giảm 35% sát thương wave Đình Công lần tới.',
    flavorText: 'Quỹ đình công là vũ khí vô hình — kẻ thù không thể đói bụng bạn ra.',
    availableFrom: 1
  },
  barricade: {
    id: 'barricade', name: 'Dựng Rào Cản', icon: '🏗️',
    cost: { capital: 10 }, effect: { control: 15 },
    description: 'Chi 10 vốn. Kiểm soát địa bàn +15.',
    flavorText: 'Một chiếc xe đẩy lật ngang đường đủ thay đổi logic của toàn bộ cuộc đối đầu.',
    availableFrom: 1
  },
  mass_rally: {
    id: 'mass_rally', name: 'Tổng Biểu Tình', icon: '📣',
    cost: { morale: 10 }, effect: { legitimacy: 20 },
    description: 'Chi 10 tinh thần. Chính danh +20.',
    flavorText: 'Hàng nghìn người cùng xuống đường — không một lực lượng nào có thể phủ nhận điều đó.',
    availableFrom: 1
  },
  negotiate: {
    id: 'negotiate', name: 'Đàm Phán', icon: '🤝',
    cost: {}, effect: { legitimacy: 10, morale: -5 },
    description: 'Chính danh +10, tinh thần -5.',
    flavorText: 'Mỗi thỏa hiệp đều có giá — câu hỏi là ai trả và ai chịu.',
    availableFrom: 2
  },
  mutual_aid: {
    id: 'mutual_aid', name: 'Tương Trợ Cộng Đồng', icon: '🤲',
    cost: { capital: 8 }, effect: { morale: 15, control: 5 },
    description: 'Chi 8 vốn. Tinh thần +15, kiểm soát +5.',
    flavorText: 'Bếp ăn tập thể, nhà kho chung — quyền lực nằm trong từng hành động nhỏ nhất.',
    availableFrom: 3
  },
  fundraise: {
    id: 'fundraise', name: 'Quyên Góp Đoàn Kết', icon: '🪙',
    cost: { morale: 8 }, effect: { capital: 18 },
    description: 'Chi 8 tinh thần. Tài nguyên +18.',
    flavorText: 'Đoàn kết không chỉ là tinh thần — đôi khi nó cần được đếm thành tiền.',
    availableFrom: 1
  },
  underground_press: {
    id: 'underground_press', name: 'Báo Chí Ngầm', icon: '📰',
    cost: { capital: 10 }, effect: { legitimacy: 15, morale: 8 },
    buff: { type: 'reduce_wave_media_war', reduction: 0.35, turns: 1 },
    description: 'Chi 10 vốn. Chính danh +15, tinh thần +8. Giảm 35% thiệt hại Chiến Tranh Truyền Thông.',
    flavorText: 'Sự thật in ra giấy, truyền tay nhau qua từng con hẻm. Không một tường lửa nào ngăn được.',
    availableFrom: 2
  },
  solidarity_network: {
    id: 'solidarity_network', name: 'Mạng Lưới Đoàn Kết', icon: '🌐',
    cost: { capital: 15 }, effect: { control: 10, morale: 8 },
    buff: { type: 'reduce_wave_crackdown', reduction: 0.35, turns: 1 },
    description: 'Chi 15 vốn. Kiểm soát +10, tinh thần +8. Giảm 35% thiệt hại Đàn Áp lần tới.',
    flavorText: 'Mạng lưới liên lạc bí mật chạy song song với thành phố — đủ để cảnh báo trước khi cơn lốc ập đến.',
    availableFrom: 3
  },
  general_strike_threat: {
    id: 'general_strike_threat', name: 'Đe Dọa Tổng Đình Công', icon: '🔥',
    cost: { morale: 12 }, effect: { legitimacy: 10 },
    buff: { type: 'reduce_wave_general_strike', reduction: 0.45, turns: 1 },
    description: 'Chi 12 tinh thần. Chính danh +10. Giảm 45% thiệt hại Tổng Đình Công.',
    flavorText: 'Đe dọa đình công toàn thành là con bài cuối cùng — nhưng đôi khi, chỉ cần rút con bài đó ra là đủ.',
    availableFrom: 4
  },

  // ── Bourgeoisie ──────────────────────────────────────────
  hire_security: {
    id: 'hire_security', name: 'Thuê An Ninh', icon: '🛡️',
    cost: { capital: 20 }, effect: { control: 20 },
    buff: { type: 'reduce_wave_sabotage', reduction: 0.4, turns: 1 },
    description: 'Chi 20 vốn. Kiểm soát +20. Giảm 40% thiệt hại Phá Hoại lần tới.',
    flavorText: 'Tiền mua được lòng trung thành — ít nhất là trong thời gian ngắn.',
    availableFrom: 1
  },
  media_campaign: {
    id: 'media_campaign', name: 'Chiến Dịch Truyền Thông', icon: '📺',
    cost: { capital: 15 }, effect: { legitimacy: 20 },
    buff: { type: 'reduce_wave_media_war', reduction: 0.4, turns: 1 },
    description: 'Chi 15 vốn. Chính danh +20. Giảm 40% thiệt hại Chiến Tranh Truyền Thông.',
    flavorText: 'Ai kiểm soát câu chuyện, người đó kiểm soát sự thật.',
    availableFrom: 1
  },
  lockout: {
    id: 'lockout', name: 'Đóng Cửa Nhà Máy', icon: '🔒',
    cost: { legitimacy: 5 }, effect: {},
    buff: { type: 'capital_gain_next', amount: 25, turns: 1 },
    description: 'Chi 5 chính danh. +25 vốn vào đầu ngày sau.',
    flavorText: 'Quyền sở hữu là quyền từ chối — đây là thứ luật pháp đã trao cho bạn.',
    availableFrom: 1
  },
  bribe_officials: {
    id: 'bribe_officials', name: 'Mua Chuộc Quan Chức', icon: '💼',
    cost: { capital: 35 }, effect: { legitimacy: -10 },
    buff: { type: 'skip_next_wave', turns: 1 },
    description: 'Chi 35 vốn. Chính danh -10. Bỏ qua wave tiếp theo hoàn toàn.',
    flavorText: 'Chính sách không phải đạo đức — chính sách là con số trong ngân sách.',
    availableFrom: 2
  },
  automate: {
    id: 'automate', name: 'Tự Động Hóa', icon: '⚙️',
    cost: { capital: 30 }, effect: {},
    buff: { type: 'passive_capital', amount: 8, permanent: true },
    description: 'Chi 30 vốn. Mỗi ngày sau +8 vốn thụ động. (Chỉ dùng 1 lần)',
    flavorText: 'Máy móc không đình công, không yêu cầu, không có nhân phẩm — đó chính xác là điều bạn cần.',
    availableFrom: 3
  },
  legal_pressure: {
    id: 'legal_pressure', name: 'Áp Lực Pháp Lý', icon: '⚖️',
    cost: { capital: 12 }, effect: { legitimacy: 10, morale: -8 },
    description: 'Chi 12 vốn. Chính danh +10. Tinh thần -8 (nội bộ phản ứng).',
    flavorText: 'Tòa án là vũ khí — biết cách sử dụng là ưu thế quyết định.',
    availableFrom: 2
  },
  propaganda_blitz: {
    id: 'propaganda_blitz', name: 'Tổng Tấn Công Truyền Thông', icon: '📻',
    cost: { capital: 22 }, effect: { legitimacy: 18, morale: -10 },
    buff: { type: 'reduce_wave_media_war', reduction: 0.5, turns: 1 },
    description: 'Chi 22 vốn. Chính danh +18. Tinh thần -10 (chi phí chính trị). Giảm 50% thiệt hại Chiến Tranh Truyền Thông.',
    flavorText: 'Không phải tuyên truyền — là định hình nhận thức. Câu chữ rất quan trọng.',
    availableFrom: 2
  },
  emergency_decree: {
    id: 'emergency_decree', name: 'Sắc Lệnh Khẩn Cấp', icon: '📜',
    cost: { legitimacy: 20 }, effect: { control: 30 },
    buff: { type: 'reduce_wave_strike', reduction: 0.3, turns: 1 },
    description: 'Chi 20 chính danh. Kiểm soát +30. Giảm 30% thiệt hại Đình Công.',
    flavorText: 'Tình trạng khẩn cấp cho phép điều không thể trở thành hợp pháp — trong một đêm.',
    availableFrom: 3
  },
  political_deal: {
    id: 'political_deal', name: 'Thỏa Thuận Chính Trị Bí Mật', icon: '🤫',
    cost: { capital: 30 }, effect: { legitimacy: 15 },
    buff: { type: 'reduce_wave_political_crisis', reduction: 0.55, turns: 1 },
    description: 'Chi 30 vốn. Chính danh +15. Giảm 55% thiệt hại Khủng Hoảng Chính Trị.',
    flavorText: 'Phòng họp tối, bắt tay kín đáo, hợp đồng không bao giờ được ký. Chính trị thực sự là như vậy.',
    availableFrom: 4
  },
  infiltrate: {
    id: 'infiltrate', name: 'Cài Người Vào Trong', icon: '🕵️',
    cost: { capital: 18 }, effect: { control: 12, morale: -12 },
    buff: { type: 'reduce_wave_general_strike', reduction: 0.4, turns: 1 },
    description: 'Chi 18 vốn. Kiểm soát +12. Tinh thần -12 (rủi ro bị lộ). Giảm 40% thiệt hại Tổng Đình Công.',
    flavorText: 'Biết trước kế hoạch của kẻ thù là lợi thế lớn hơn bất kỳ vũ khí nào.',
    availableFrom: 3
  }
};

const WAVES = {
  strike: {
    id: 'strike', name: 'Đình Công Lan Rộng', icon: '⚡',
    damage: { capital: -20, control: -15 },
    mitigators: [
      { stat: 'morale',     threshold: 60, reduction: 0.4 },
      { stat: 'legitimacy', threshold: 60, reduction: 0.3 }
    ],
    announcement: [
      'Còi báo động vang lên từ khu nhà máy phía đông lúc bình minh. Công nhân bỏ dây chuyền hàng loạt — không phải tự phát, mà có tổ chức. Ai đó đã lên kế hoạch cho điều này từ nhiều ngày trước.',
      'Tin từ các xưởng dệt: cổng nhà máy bị chặn từ bên trong. Những người cố vào làm bị chặn lại bằng im lặng và ánh mắt. Không cần bạo lực — áp lực đã đủ để làm tê liệt cả khu sản xuất.',
      'Đình công lan từ nhà máy này sang nhà máy khác như lửa gặp rơm khô. Mỗi giờ trôi qua, thêm một xưởng ngừng hoạt động. Dây chuyền sản xuất cả thành phố đứng trước nguy cơ tê liệt hoàn toàn.',
      'Tiếng còi nhà máy im bặt từ sáng sớm. Không phải vì ca đã kết thúc — mà vì không còn ai vào làm. Khu công nghiệp im lặng theo cách mà ai cũng hiểu nhưng không ai dám nói thành lời.'
    ],
    resolution: {
      high: 'Đình công bị làm chậm lại nhờ sự chuẩn bị của bạn. Một số xưởng hoạt động trở lại trước chiều, thiệt hại ở mức kiểm soát được.',
      mid: 'Đình công gây hỗn loạn nhất định — ba xưởng mất nguyên một ca làm việc, nhưng tình hình không leo thang thêm. Một chiến thắng không hoàn toàn, nhưng vẫn là chiến thắng.',
      low: 'Đình công quét qua như cơn lũ. Không có gì cản được nó. Tổn thất tài nguyên nặng nề, kiểm soát địa bàn lung lay — và điều tệ nhất là ai cũng nhìn thấy điều đó xảy ra.'
    }
  },

  sabotage: {
    id: 'sabotage', name: 'Phá Hoại Cơ Sở', icon: '💥',
    damage: { capital: -25, morale: -10 },
    mitigators: [
      { stat: 'control', threshold: 50, reduction: 0.5 }
    ],
    announcement: [
      'Báo cáo khẩn từ kho hàng số 3: máy móc bị hư hỏng có chủ đích, ống dẫn bị cắt đứt một cách chính xác. Đây không phải tai nạn — bàn tay phá hoại đang hoạt động từ bên trong.',
      'Điện cúp ở toàn bộ khu sản xuất lúc nửa đêm. Khi điện trở lại vào sáng hôm sau, ba dây chuyền đã hỏng hoàn toàn. Thiệt hại quá chính xác và có hệ thống để là ngẫu nhiên.',
      'Trong bóng tối, ai đó đã lên kế hoạch tỉ mỉ và thực hiện không để lại dấu vết. Buổi sáng hôm sau, số thiệt hại được đưa ra còn đáng sợ hơn cả hành động phá hoại — vì không ai biết ai đã làm điều này.',
      'Không rõ thủ phạm, không rõ quy mô thực sự. Chỉ biết rằng những gì bị phá hủy đêm qua sẽ mất nhiều tuần để sửa chữa — và tiếng đồn đang lan nhanh hơn bất kỳ thông cáo chính thức nào.'
    ],
    resolution: {
      high: 'Lực lượng kiểm soát đã phát hiện và ngăn chặn phần lớn thiệt hại. Kẻ phá hoại bị cô lập trước khi gây ra hậu quả toàn diện.',
      mid: 'Phá hoại gây ra thiệt hại đáng kể nhưng không đến mức thảm họa. Một phần cơ sở vật chất bị hỏng, tinh thần bị ảnh hưởng — cái giá của sự bất cẩn.',
      low: 'Phá hoại tràn lan không kiểm soát. Thiệt hại vật chất nghiêm trọng, tinh thần lung lay — và tệ hơn, không ai biết đây mới chỉ là bắt đầu hay đã là tất cả.'
    }
  },

  crackdown: {
    id: 'crackdown', name: 'Đàn Áp Bạo Lực', icon: '🔴',
    damage: { morale: -25, legitimacy: -20 },
    mitigators: [
      { stat: 'capital',  threshold: 50, reduction: 0.35 },
      { stat: 'control',  threshold: 60, reduction: 0.35 }
    ],
    announcement: [
      'Lực lượng an ninh triển khai với dùi cui và vòi rồng vào lúc sáng sớm, trước khi ai kịp phản ứng. Khu lao động đang bị bao vây — những ai cố ra ngoài bị đẩy lại bằng vũ lực.',
      'Danh sách bắt giữ đêm qua có 27 cái tên. Tất cả đều là thành viên chủ chốt — ai đó đã cung cấp thông tin từ bên trong. Tổ chức đang đứng trước mối đe dọa từ cả bên ngoài lẫn bên trong.',
      'Đàn áp diễn ra công khai và tàn nhẫn — không cần che giấu. Máy quay điện thoại từ các ban công ghi lại tất cả. Những hình ảnh đó sẽ không bị quên, và cả hai phía đều biết điều đó có nghĩa gì.',
      'Xe bọc thép xuất hiện lúc bình minh ở ba giao lộ chính, chặn mọi tuyến đường ra vào khu lao động. Không ai bắn một phát nào — nhưng sự hiện diện đó gửi đi một thông điệp rõ ràng hơn bất kỳ lời tuyên bố chính thức nào.'
    ],
    resolution: {
      high: 'Sự chuẩn bị và nguồn lực của bạn đã hạn chế tác động. Đàn áp diễn ra nhưng không đạt được mục tiêu — một chiến thắng tốn kém nhưng cần thiết.',
      mid: 'Đàn áp gây ra tổn thất tinh thần và uy tín không nhỏ. Vết thương vẫn còn đó, nhưng tổ chức chưa gãy.',
      low: 'Đàn áp tàn khốc và không bị cản trở. Tinh thần suy sụp, hình ảnh trước công luận bị tổn hại nghiêm trọng — và điều tệ nhất là nó đã xảy ra trước mắt hàng nghìn người.'
    }
  },

  general_strike: {
    id: 'general_strike', name: 'Tổng Đình Công Toàn Thành', icon: '🔥',
    damage: { capital: -35, control: -20, morale: -10 },
    mitigators: [
      { stat: 'legitimacy', threshold: 65, reduction: 0.4 },
      { stat: 'morale',     threshold: 70, reduction: 0.3 }
    ],
    announcement: [
      'Không còn là đình công của một xưởng hay một khu. Hôm nay, toàn bộ thành phố ngừng lại. Xe buýt không chạy, chợ đóng cửa, trường học trống rỗng. Đây là loại áp lực không thể giải quyết bằng thương lượng thông thường.',
      'Tổng đình công được tuyên bố lúc nửa đêm qua, lan qua các kênh bí mật được chuẩn bị từ nhiều ngày trước. Buổi sáng chứng kiến điều chưa từng thấy trong 20 năm — thành phố im lặng hoàn toàn. Không phải im lặng của sợ hãi. Là im lặng của quyết tâm.',
      'Lời kêu gọi đình công chạm đến từng ngành, từng khu vực, từng tầng lớp. Hôm nay tất cả cùng dừng lại như một cơ thể thống nhất. Đây là khoảnh khắc mà các sách lịch sử sau này sẽ phải ghi lại — dù kết quả thế nào.'
    ],
    resolution: {
      high: 'Tổng đình công bị phân hóa nhờ sự chuẩn bị dài hạn. Sự đoàn kết không đủ để tạo ra áp lực quyết định — lần này.',
      mid: 'Tổng đình công gây thiệt hại nặng. Thành phố tê liệt một ngày — đủ để mọi người hiểu rằng không ai thực sự kiểm soát được tình hình.',
      low: 'Tổng đình công hoàn toàn thành công. Cả thành phố ngừng lại, và không ai — kể cả bạn — có thể làm gì ngoài chờ đợi nó kết thúc theo điều kiện của chính nó.'
    }
  },

  media_war: {
    id: 'media_war', name: 'Chiến Tranh Truyền Thông', icon: '📡',
    damage: { legitimacy: -25, morale: -15 },
    mitigators: [
      { stat: 'capital',  threshold: 55, reduction: 0.4 },
      { stat: 'control',  threshold: 50, reduction: 0.3 }
    ],
    announcement: [
      'Bài báo đầu tiên xuất hiện lúc 6 giờ sáng. Đến trưa, nó được chia sẻ hàng chục nghìn lần. Thông tin không sai hoàn toàn — nhưng được chọn lọc và xếp đặt đủ để tạo ra một câu chuyện hoàn toàn khác với thực tế.',
      'Truyền hình đưa tin live từ "hiện trường" — nhưng góc quay được chọn rất kỹ lưỡng. Chỉ một mảnh của bức tranh được hiển thị, nhưng đó đúng là mảnh đủ để định hình dư luận trước khi ai kịp phản bác.',
      'Mạng xã hội bùng nổ với các hashtag được tổ chức bài bản từ trước. Những tài khoản không ai từng nghe tên đột nhiên có hàng trăm nghìn follower. Cuộc chiến này không diễn ra trên đường phố — nó diễn ra trên màn hình điện thoại của từng người dân thành phố.'
    ],
    resolution: {
      high: 'Nguồn lực và sự chuẩn bị của bạn đã tạo ra đủ phản pháo để làm chậm làn sóng thông tin bất lợi. Câu chuyện chưa được kiểm soát hoàn toàn — nhưng chưa mất.',
      mid: 'Chiến tranh truyền thông gây thiệt hại không nhỏ. Hình ảnh bị tổn hại, tinh thần dao động — cuộc chiến vẫn tiếp diễn trên từng trang báo.',
      low: 'Bạn thua hoàn toàn cuộc chiến truyền thông. Câu chuyện về bạn giờ được kể bởi kẻ thù — và đó là phiên bản tệ nhất có thể tưởng tượng.'
    }
  },

  political_crisis: {
    id: 'political_crisis', name: 'Khủng Hoảng Chính Trị', icon: '🏛️',
    damage: { legitimacy: -30, capital: -15 },
    mitigators: [
      { stat: 'morale',   threshold: 65, reduction: 0.4 },
      { stat: 'control',  threshold: 55, reduction: 0.25 }
    ],
    announcement: [
      'Cuộc bỏ phiếu khẩn cấp tại hội đồng thành phố kết thúc lúc nửa đêm với kết quả bất lợi. Điều đáng sợ hơn số phiếu là ba thành viên trước đây ủng hộ bạn đã bỏ phiếu ngược lại — không giải thích, không liên lạc trước.',
      'Tuyên bố từ phủ thống đốc xuất hiện lúc sáng sớm, được soạn thảo cẩn thận đến mức không thể buộc tội ai — nhưng ai cũng hiểu nó muốn nói điều gì. Tính chính danh đang bị tấn công từ hướng không ngờ nhất.',
      'Liên minh chính trị bạn đã xây dựng đang rạn nứt từ bên trong. Không phải vì xung đột — mà vì mỗi người đang tự tính toán lợi ích riêng trong một tình huống ngày càng khó đoán hơn.'
    ],
    resolution: {
      high: 'Khủng hoảng chính trị được kiềm chế nhờ sức mạnh nội lực của tổ chức. Đủ đoàn kết để các đối thủ chính trị phải tính lại chiến lược.',
      mid: 'Khủng hoảng để lại vết thương. Tính chính danh và nguồn lực bị tổn hại, nhưng cấu trúc cơ bản vẫn còn — tạm thời.',
      low: 'Khủng hoảng chính trị là đòn nặng nhất từ trước đến nay. Những đồng minh tưởng chừng chắc chắn giờ đây im lặng — im lặng theo cách mà ai cũng hiểu là từ bỏ mà không cần tuyên bố.'
    }
  }
};

const WAVE_SCHEDULE = {
  1: ['strike'],
  2: ['crackdown'],
  3: ['sabotage', 'media_war'],
  4: ['strike', 'crackdown'],
  5: ['general_strike'],
  6: ['political_crisis', 'sabotage'],
  7: ['strike', 'crackdown', 'general_strike']
};

const EVENTS = [
  {
    id: 'first_blood',
    day: 1,
    title: 'Tiếng Vang Đầu Tiên',
    text: 'Một nhóm công nhân trẻ đang chờ bên ngoài trụ sở — họ muốn hành động ngay hôm nay, không cần kế hoạch dài hạn. Phần còn lại của tổ chức nhìn vào bạn và chờ đợi quyết định.',
    choices: [
      { label: 'Để họ hành động — khí thế quan trọng hơn', effect: { morale: 15, control: -8, legitimacy: -5 } },
      { label: 'Kiềm chế — đây chưa phải thời điểm', effect: { morale: -8, legitimacy: 10, capital: 5 } }
    ]
  },
  {
    id: 'neutral_observer',
    day: 2,
    title: 'Nhà Báo Điều Tra',
    text: 'Một nhà báo độc lập đã tìm được cách tiếp cận bạn. Cô ta không thuộc phe nào — nhưng bài viết của cô sẽ được đọc bởi hàng chục nghìn người. Phản ứng của bạn hôm nay sẽ định hình câu chuyện mà công luận nghe.',
    choices: [
      { label: 'Tiếp đón cởi mở, cung cấp bằng chứng', effect: { legitimacy: 18, capital: -8, morale: 5 } },
      { label: 'Tiếp nhưng kiểm soát thông tin', effect: { legitimacy: 8, capital: -3 } },
      { label: 'Từ chối — không tin bất kỳ ai bên ngoài', effect: { legitimacy: -8, morale: 5 } }
    ]
  },
  {
    id: 'betrayal',
    day: 3,
    title: 'Kẻ Phản Bội Trong Hàng Ngũ',
    text: 'Tình báo nội bộ xác nhận: một thành viên ban chấp hành đã cung cấp thông tin cho phía đối lập. Chưa rõ bao nhiêu đã bị tiết lộ. Bạn cần quyết định ngay — mỗi giờ chờ đợi là thêm một rủi ro.',
    choices: [
      { label: 'Đối chất công khai trước tổ chức', effect: { morale: 12, legitimacy: -10, control: 8 } },
      { label: 'Xử lý kín — cô lập khỏi thông tin nhạy cảm', effect: { control: 15, morale: -5, capital: -5 } },
      { label: 'Bỏ qua — không đủ bằng chứng chắc chắn', effect: { capital: 8, morale: -12, legitimacy: -5 } }
    ]
  },
  {
    id: 'defection',
    day: 4,
    title: 'Đào Ngũ Nội Bộ',
    text: 'Một thành viên chủ chốt — người phụ trách liên lạc với ba khu vực quan trọng — đang cân nhắc rời bỏ. Anh ta kiệt sức, nghi ngờ kết quả, và nhận được lời đề nghị từ phía đối lập. Bạn có ít hơn một ngày để phản ứng.',
    choices: [
      { label: 'Thuyết phục bằng viễn cảnh và lý tưởng', effect: { morale: 12, capital: -10, legitimacy: 5 } },
      { label: 'Đề xuất điều kiện tốt hơn — thực dụng', effect: { morale: 5, capital: -15 } },
      { label: 'Để anh ta đi — ưu tiên những người còn lại', effect: { morale: -15, control: 12, capital: 5 } }
    ]
  },
  {
    id: 'outside_support',
    day: 5,
    title: 'Hỗ Trợ Từ Bên Ngoài',
    text: 'Một tổ chức quốc tế với nguồn lực đáng kể đề nghị hỗ trợ. Tiền sẽ đến ngay hôm nay. Nhưng cái giá là hình ảnh: một số người sẽ gọi đây là "can thiệp từ bên ngoài" và dùng nó chống lại bạn.',
    choices: [
      { label: 'Nhận hỗ trợ — nguồn lực là sống còn', effect: { capital: 25, legitimacy: -12, morale: 5 } },
      { label: 'Nhận một phần, công khai hóa thỏa thuận', effect: { capital: 12, legitimacy: -3 } },
      { label: 'Từ chối — tự lực cánh sinh đến cùng', effect: { morale: 15, legitimacy: 8, capital: -5 } }
    ]
  },
  {
    id: 'eve_of_battle',
    day: 6,
    title: 'Đêm Trước Ngày Quyết Định',
    text: 'Đêm nay, một thỏa thuận ngừng chiến bất ngờ được đề xuất qua trung gian. Hai bên sẽ dừng mọi hành động trong 48 giờ để đàm phán. Đây có thể là cơ hội — hoặc là bẫy được giăng ra trước ngày cuối cùng.',
    choices: [
      { label: 'Chấp nhận ngừng chiến — tích lũy sức mạnh', effect: { capital: 15, morale: 8, control: -10, legitimacy: -5 } },
      { label: 'Từ chối — không tin vào thỏa thuận giờ chót', effect: { morale: 15, legitimacy: 10, capital: -8 } }
    ]
  },
  {
    id: 'final_gambit',
    day: 7,
    title: 'Nước Đi Cuối Cùng',
    text: 'Vào đúng ngày quyết định, một lá bài bất ngờ được tung ra: phía đối lập đề xuất nhượng bộ một phần đổi lấy việc bạn không leo thang thêm. Đây là khoảnh khắc mà mọi thứ trước đây dẫn đến — nhưng câu trả lời không đơn giản như nó có vẻ.',
    choices: [
      { label: 'Chấp nhận nhượng bộ một phần — bảo toàn tổ chức', effect: { morale: -10, capital: 20, legitimacy: 15, control: 5 } },
      { label: 'Từ chối — tất cả hoặc không có gì', effect: { morale: 20, legitimacy: -10, capital: -10 } }
    ]
  }
];

const DAY_BRIEFINGS = {
  1: { label: 'Giờ Đầu Tiên',     tip: 'Đình công bùng nổ ngay ngày đầu. Kiểm tra wave panel — nếu Tinh Thần ≥ 60 và Chính Danh ≥ 60, bạn sẽ giảm được 70% thiệt hại. Ưu tiên hành động rẻ và xây dựng nền tảng.' },
  2: { label: 'Leo Thang',          tip: 'Đàn áp nhắm vào Tinh Thần và Chính Danh. Nếu Tài Nguyên ≥ 50 hoặc Kiểm Soát ≥ 60, thiệt hại giảm đáng kể. Hành động ngay trước khi kết thúc lượt.' },
  3: { label: 'Hai Mặt Trận',      tip: 'Phá hoại kèm Chiến Tranh Truyền Thông — tài nguyên và hình ảnh bị tấn công đồng thời. Không thể bảo vệ tất cả mọi thứ: hãy chọn điều quan trọng hơn.' },
  4: { label: 'Điểm Gãy',          tip: 'Đây là ngày nhiều người buông bỏ. Hai wave, hai hướng tấn công. Giữ tất cả các chỉ số trên 30 — dưới ngưỡng đó, mọi thứ bắt đầu sụp đổ theo dây chuyền.' },
  5: { label: 'Tổng Lực',          tip: 'Tổng Đình Công Toàn Thành — wave mạnh nhất từ đầu game, đánh cả 3 chỉ số. Cần Chính Danh ≥ 65 hoặc Tinh Thần ≥ 70 để giảm thiểu. Đây là khoảnh khắc quyết định giữa trận.' },
  6: { label: 'Đêm Trước Bão',     tip: 'Khủng hoảng Chính Trị kèm Phá Hoại. Buff tích lũy từ hôm nay sẽ hỗ trợ ngày cuối — đây là lượt đầu tư cuối cùng trước khi tất cả được quyết định.' },
  7: { label: 'Ngày Quyết Định',   tip: 'Ba wave với toàn bộ sức mạnh cùng lúc. Mọi buff, mọi mitigator đều có giá trị nhân đôi hôm nay. Không còn cơ hội sửa sai — mọi thứ phụ thuộc vào những quyết định bạn đã đưa ra.' }
};

const BUFF_LABELS = {
  reduce_wave_strike:          'Quỹ Đình Công — giảm thiệt hại Đình Công',
  reduce_wave_sabotage:        'An Ninh — giảm thiệt hại Phá Hoại',
  reduce_wave_crackdown:       'Mạng Lưới Đoàn Kết — giảm thiệt hại Đàn Áp',
  reduce_wave_general_strike:  'Phòng Thủ Tổng Đình Công',
  reduce_wave_media_war:       'Phòng Thủ Truyền Thông',
  reduce_wave_political_crisis:'Thỏa Thuận Chính Trị — giảm Khủng Hoảng',
  skip_next_wave:              'Quan chức bị mua — bỏ qua wave tiếp theo',
  capital_gain_next:           'Đóng cửa nhà máy — +25 tài nguyên đầu ngày sau'
};

const STAT_META = {
  morale:     { label: 'Tinh Thần',   icon: '❤️', color: '#e63946', description: 'Đoàn kết nội bộ và ý chí chiến đấu của phe bạn. Về 0 → tổ chức tan rã, không còn khả năng kháng cự.' },
  capital:    { label: 'Tài Nguyên',  icon: '💎', color: '#2a9d8f', description: 'Vốn dự trữ và khả năng hành động. Về 0 → không thể thực hiện bất kỳ hành động nào trong lượt.' },
  control:    { label: 'Kiểm Soát',   icon: '🏴', color: '#457b9d', description: 'Mức độ kiểm soát địa bàn và cơ sở hạ tầng. Cao → giảm thiệt hại từ Phá Hoại và Đàn Áp.' },
  legitimacy: { label: 'Chính Danh',  icon: '⚡', color: '#e9c46a', description: 'Tính chính danh trước quần chúng. Thấp → quần chúng trung lập quay lưng; Cao → giảm thiệt hại từ Đình Công.' }
};

const NARRATIVE = {
  prologue: `Thành phố này đang đứng trước một cuộc khủng hoảng. Không phải khủng hoảng của thiên tai hay dịch bệnh — mà là của những mâu thuẫn đã âm ỉ từ bên trong, từng ngày, từng năm.

Phía bắc là khu công nghiệp, nơi khói bốc lên từ sáng sớm đến tối mịt và tiếng máy móc không bao giờ ngừng. Phía nam là khu dân sinh, nơi những người đã vận hành những cỗ máy đó trở về sau 12 giờ làm việc với đôi tay trống rỗng và một cơn giận lặng lẽ tích tụ qua nhiều năm.

Hai thế lực đang va chạm. Cái gì đó sắp vỡ. Và bạn đứng ở đây, ngay giữa tâm chấn.

Bạn là ai trong tất cả điều này?`,

  factionIntro: {
    proletariat: `Bạn là Ban Chấp Hành Liên Công Đoàn Khu Công Nghiệp — tổng hợp của hàng trăm giọng nói, hàng nghìn câu chuyện, hàng triệu giờ lao động không được ghi nhận đúng giá trị.

Trụ sở bằng bê tông cũ kỹ, chiếc bàn họp sứt mẻ, màn hình máy tính phủ bụi. Nhưng trong phòng này, qua những cuộc tranh luận kéo dài đến tận nửa đêm, qua những bức thư tay chuyển tay nhau trong các tổ bào — mỗi quyết định bạn đưa ra sẽ quyết định tương lai của những người không có ai đại diện ngoài bạn.

Họ không có vốn. Họ không có quyền lực. Nhưng họ có thứ mà không tiền nào mua được: đôi tay vận hành cả thành phố này.

Bảy ngày. Đủ để thay đổi mọi thứ — hoặc mất tất cả.`,

    bourgeoisie: `Bạn là Hội Đồng Kinh Doanh Thành Phố — tiếng nói của những người đã đổ mồ hôi, vốn liếng và đôi khi cả máu để xây dựng nên cơ sở hạ tầng công nghiệp này từ con số không.

Văn phòng tầng 27 nhìn xuống toàn bộ khu công nghiệp như một tấm bản đồ. Báo cáo tài chính sáng nay không tốt — con số thiệt hại từ tuần trước chưa được bù đắp. Các đối tác vốn đang gọi điện. Nhân viên đang gửi email — một số có ngụ ý đe dọa, số khác đơn giản là đang tìm đường thoát.

Bạn đã xây dựng điều này. Bạn không thể để nó sụp đổ trong tay những kẻ không hiểu cái giá của nó.

Bảy ngày để ổn định tình hình. Dù bằng bất cứ giá nào.`
  },

  dailyNarrative: {
    proletariat: {
      2: `Đêm qua có người gõ cửa lúc 2 giờ sáng — một công nhân từ xưởng số 7, mặt sưng húp, tay run. Anh ta kể về những gì đã xảy ra trong ca đêm. Bạn ghi lại, nhưng phần của câu chuyện không thể ghi lại được là ánh mắt anh ta khi kể — không phải sợ hãi, mà là câu hỏi không nói thành lời: liệu có ai sẽ đứng cho chúng tôi không?

Sáng hôm nay, đám đông trước trụ sở đông hơn hôm qua. Họ không hét, không biểu ngữ. Họ chỉ đứng đó và nhìn vào cánh cửa. Đó là áp lực nặng hơn bất kỳ yêu cầu nào được viết ra.`,

      3: `Một số thành viên trung thành nhất bắt đầu đặt câu hỏi mà trước đây họ không bao giờ hỏi: "Chúng ta đang chiến đấu vì điều gì? Và đến khi nào?"

Đó không phải câu hỏi của sự yếu đuối. Đó là câu hỏi của những người đã đứng lâu đến mức chân bắt đầu mỏi, và họ cần có lý do đủ tốt để tiếp tục đứng thêm một ngày nữa.

Bạn phải có câu trả lời. Không phải câu trả lời hay — mà câu trả lời thật.`,

      4: `Hai mặt trận cùng một lúc: trong khi đàm phán với giới chủ ở hội trường tầng hai, các đội liên lạc báo cáo leo thang ở khu ký túc xá công nhân. Không thể ở cả hai nơi cùng một lúc — nhưng quyết định ở đây là chọn cái nào có thể bỏ qua tạm thời mà không gây hậu quả không thể cứu vãn.

Không có lựa chọn tốt. Chỉ có lựa chọn ít tệ hơn.`,

      5: `Ngày thứ năm. Người ta bắt đầu nhìn nhau theo cách khác — không còn cùng nhau chịu đựng, mà bắt đầu tính xem ai sẽ là người cuối cùng đứng vững.

Đây là giai đoạn nguy hiểm nhất không phải vì kẻ thù từ bên ngoài — mà vì sự nghi ngờ từ bên trong. Và bạn biết rằng: một tổ chức bắt đầu nghi ngờ nhau thì kẻ thù chỉ cần đứng đợi.`,

      6: `Chỉ còn một ngày nữa. Buổi tối hôm nay, sau cuộc họp, một người hỏi bạn nhỏ: "Anh/chị nghĩ chúng ta có qua được không?" Bạn trả lời: "Tôi không biết. Nhưng tôi biết chúng ta sẽ không tìm ra nếu không thử."

Đó không phải câu trả lời anh ta muốn nghe. Nhưng đó là câu trả lời duy nhất bạn có.`,

      7: `Ngày cuối cùng. Bảy ngày dẫn đến khoảnh khắc này.

Trước khi bước ra cửa, bạn nhìn lại phòng họp — bàn ghế cũ kỹ, những tờ giấy chi chít ghi chú, ly cà phê đã nguội từ lúc nào. Và bạn nhớ lại tại sao mình bắt đầu điều này.

Không phải vì nghĩ mình sẽ thắng. Mà vì có những điều không thể không làm.`
    },
    bourgeoisie: {
      2: `Điện thoại từ các đối tác vốn đầu tư đổ vào từ 7 giờ sáng. Không ai hỏi thẳng "chuyện gì đang xảy ra?" — họ chỉ hỏi về "triển vọng quý tới" và "kế hoạch liên tục kinh doanh". Bạn đọc được ý nghĩa thực sau những câu hỏi lịch sự đó.

Ổn định — hay ít nhất là vẻ ổn định đủ để họ không rút tiền — là điều cần thiết hơn bao giờ hết. Hôm nay không phải ngày để trung thực với các nhà đầu tư.`,

      3: `Kế toán trưởng gõ cửa với bộ mặt đăm chiêu và bảng số liệu mà ông ta cẩn thận gấp lại trước khi đưa cho bạn — như thể làm chậm lại khoảnh khắc bạn đọc nó cũng giúp ích được gì đó.

Con số thiệt hại cần phải được giải thích trước hội đồng. Câu hỏi là liệu giải thích đó có đủ thuyết phục — hay cần phải thay đổi cách đọc con số, thay đổi khung phân tích, thay đổi định nghĩa "thiệt hại".`,

      4: `Hội đồng chia rẽ. Một nhóm muốn leo thang — siết chặt kiểm soát, không nhượng bộ. Nhóm kia lo ngại về hình ảnh trước công luận và chính quyền. Và có một nhóm thứ ba không nói gì cả, chỉ đợi xem ai thắng trước khi đứng về phía đó.

Bạn phải chọn hướng đi và thuyết phục đủ người đi theo — không phải vì họ tin bạn, mà vì họ sợ hậu quả của việc không đi theo bạn.`,

      5: `Những gì trước đây xảy ra sau cổng nhà máy nay xuất hiện trên truyền thông đại chúng. Bức tường giữa "trong" và "ngoài" đang sụp đổ, và không có ngân sách PR nào xây lại được nó.

Kiểm soát câu chuyện bây giờ quan trọng ngang kiểm soát sản xuất. Đôi khi còn quan trọng hơn — vì một nhà máy hỏng có thể sửa, nhưng niềm tin của công luận một khi mất đi thì mất theo một cách khác.`,

      6: `Các luật sư làm việc tăng ca. Quan hệ công chúng gửi bản nháp thông cáo thứ ba trong tuần — bản thứ tư đang được viết. Toàn bộ bộ máy đang vận hành theo quán tính, mỗi người làm phần việc của mình mà không ai nhìn thấy toàn bộ bức tranh.

Bạn là người duy nhất nhìn thấy nó. Và câu hỏi là: với tất cả những gì bạn biết — bạn nghĩ ngày mai sẽ như thế nào?`,

      7: `Ngày cuối cùng của cuộc khủng hoảng. Hoặc nó kết thúc ở đây, hoặc leo thang thành thứ không ai kiểm soát được — không phải bạn, không phải họ.

Nhìn xuống từ tầng 27, thành phố trông bình thường như mọi ngày. Xe cộ, người đi lại, khói từ các ống khói. Nhưng bạn biết rằng cái bình thường đó là lớp vỏ mỏng đang che giấy điều gì đó đang sôi sục bên dưới.

Đây là lúc bạn chứng minh rằng bạn xứng đáng với vị trí này.`
    }
  },

  epilogue: {
    proletariat: {
      win: `Bảy ngày. Không phải chiến thắng hoàn toàn — không bao giờ là thế trong những cuộc đấu tranh như thế này.

Nhưng tổ chức còn đứng vững. Tiếng nói của công nhân vẫn được nghe. Và điều đó, trong những hoàn cảnh như thế này, là đủ để gọi là chiến thắng.

Hôm nay sẽ không thay đổi mọi thứ — những cơ cấu tạo ra bất công không biến mất chỉ vì thua một trận. Nhưng điều đó không có nghĩa là ngày hôm nay không quan trọng.

Cuộc đấu tranh tiếp tục. Nhưng hôm nay, bạn đã không để nó kết thúc ở đây.`,

      lose_morale: `Tinh thần đã tan vỡ trước khi kẻ thù kịp ra đòn quyết định. Từng người rời đi theo cách của họ — không phải trong sợ hãi, mà trong mệt mỏi tích lũy qua nhiều ngày.

Có những cuộc đấu tranh không thua vì lực lượng đối địch quá mạnh, mà vì bên trong đã không còn đủ lửa để tiếp tục. Đây là một trong số đó. Và bạn, hơn ai hết, hiểu rằng đó không phải lỗi của bất kỳ ai — mà là của tất cả mọi người.

Lần sau, nếu có lần sau, sẽ phải bắt đầu bằng thứ mà lần này bạn đã không giữ được: lòng tin vào nhau.`,

      lose_capital: `Nguồn lực cạn kiệt là cách tổ chức chết đi trong im lặng. Không có cảnh tượng đổ vỡ kịch tính, không có khoảnh khắc đầu hàng rõ ràng — chỉ là ngày nào đó không còn đủ tiền cho cuộc họp tiếp theo, và mọi người dần hiểu rằng cuộc chiến đã kết thúc mà không có ai tuyên bố.

Có những trận đấu cần nhiều hơn ý chí để chiến thắng. Lần này, bạn đã có ý chí nhưng thiếu phương tiện. Hai thứ đó phải cùng có mặt — và đây là bài học đắt giá nhất bạn nhận được hôm nay.`
    },
    bourgeoisie: {
      win: `Bảy ngày giữ vững. Dây chuyền sản xuất tiếp tục, lợi nhuận tiếp tục chảy, trật tự được duy trì — ít nhất là trên bề mặt, ít nhất là cho đến lần sau.

Không phải bằng sức mạnh thuần túy. Bằng tính toán, bằng kiểm soát, bằng khả năng đọc trước những gì người khác sẽ làm và hành động trước khi họ kịp phản ứng.

Nhưng khi đèn tắt trong văn phòng tầng 27, khi tất cả ra về và chỉ còn mình bạn với những con số và câu hỏi không ai dám hỏi thành lời — bạn biết rằng điều này sẽ xảy ra lần nữa. Và lần sau có thể khác.`,

      lose_capital: `Khi tiền cạn, quyền lực tan chảy theo — không phải dần dần, mà đột ngột theo cái cách làm bạn ngạc nhiên dù bạn đã biết nó đang đến.

Không phải vì người ta nổi dậy. Mà vì không còn gì để bảo vệ, không còn ai muốn giữ guồng máy chạy.

Dây chuyền sản xuất ngừng không phải vì bị phá hoại — mà vì không còn ai thấy có lý do để duy trì nó. Đây là thứ mà những người xây dựng đế chế thường không học được cho đến khi quá muộn: vốn mua được nhiều thứ, nhưng không mua được sự tiếp tục.`,

      lose_legitimacy: `Quyền lực không có chính danh là bạo ngược — và bạo ngược luôn có điểm kết thúc, dù đến sớm hay muộn.

Những công cụ bạn dùng để kiểm soát dần trở thành bằng chứng chống lại bạn. Chính quyền quay lưng không phải vì đạo đức — mà vì họ đã tính toán rằng ủng hộ bạn sẽ tốn kém hơn bỏ rơi bạn. Đó là ngôn ngữ duy nhất mà bạn và họ đều hiểu: ngôn ngữ của chi phí và lợi ích.

Hôm nay, chi phí của việc là đồng minh với bạn đã vượt quá giá trị của nó.`
    }
  }
};
