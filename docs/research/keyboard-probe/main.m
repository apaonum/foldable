#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>

static NSString *RectS(CGRect r) { return [NSString stringWithFormat:@"[%g,%g,%g,%g]", r.origin.x, r.origin.y, r.size.width, r.size.height]; }
static NSString *Insets(UIEdgeInsets i) { return [NSString stringWithFormat:@"[%g,%g,%g,%g]", i.top, i.left, i.bottom, i.right]; }

@interface ProbeVC : UIViewController
@property (nonatomic) WKWebView *web;
@property (nonatomic) UIHinge *lastHinge;
@end

@implementation ProbeVC
// Same shape as the web snapshots so both land in one log.jsonl, ordered by arrival.
- (void)log:(NSString *)trigger keyboard:(NSValue *)endFrame {
    UIView *v = self.view;
    NSMutableArray *div = [NSMutableArray array];
    for (UIViewReservedRegion *r in [v reservedRegionsOfKind:UIViewReservedRegionKind.divisionRegionKind
                                                     options:UIViewReservedRegionQueryOptionsIncludeInactive]) {
        [div addObject:@{@"active": @(r.isActive), @"frame": RectS(r.frame)}];
    }
    NSMutableDictionary *s = [@{
        @"src": @"native", @"trigger": trigger, @"t": [[NSISO8601DateFormatter new] stringFromDate:NSDate.date],
        @"bounds": RectS(v.bounds), @"safe": Insets(v.safeAreaInsets),
        @"hSize": @(self.traitCollection.horizontalSizeClass), @"vSize": @(self.traitCollection.verticalSizeClass),
        @"hinge": @(self.lastHinge.status), @"angle": @(self.lastHinge ? self.lastHinge.angle : -1),
        @"division": div,
        @"kbGuide": RectS(v.keyboardLayoutGuide.layoutFrame),
        @"webFrame": RectS(self.web.frame),
        @"contentInset": Insets(self.web.scrollView.contentInset),
        @"adjustedInset": Insets(self.web.scrollView.adjustedContentInset),
        @"contentOffset": NSStringFromCGPoint(self.web.scrollView.contentOffset),
    } mutableCopy];
    if (endFrame) {
        UIScreen *screen = v.window.windowScene.screen;
        s[@"kbScreen"] = RectS(endFrame.CGRectValue);
        s[@"kbInView"] = RectS([v convertRect:endFrame.CGRectValue fromCoordinateSpace:screen.coordinateSpace]);
    }
    NSData *body = [NSJSONSerialization dataWithJSONObject:s options:0 error:nil];
    NSLog(@"KBPROBE %@", [[NSString alloc] initWithData:body encoding:NSUTF8StringEncoding]);
    NSMutableURLRequest *req = [NSMutableURLRequest requestWithURL:[NSURL URLWithString:@"http://localhost:8765/log"]];
    req.HTTPMethod = @"POST";
    req.HTTPBody = body;
    [[NSURLSession.sharedSession dataTaskWithRequest:req] resume];
}

- (void)viewDidLoad {
    [super viewDidLoad];
    self.view.backgroundColor = UIColor.systemBackgroundColor;
    __weak typeof(self) weakSelf = self;
    [self.view addInteraction:[[UIHingeInteraction alloc] initWithUpdateHandler:^(UIHingeInteraction *i, UIHingeInteractionUpdate *u) {
        weakSelf.lastHinge = u.hinge;
    }]];
    [self registerForTraitChanges:@[UITraitHorizontalSizeClass.class, UITraitVerticalSizeClass.class]
                      withHandler:^(ProbeVC *vc, UITraitCollection *prev) { [vc log:@"traitChange" keyboard:nil]; }];
    for (NSNotificationName n in @[UIKeyboardWillShowNotification, UIKeyboardDidShowNotification,
                                   UIKeyboardWillHideNotification, UIKeyboardDidHideNotification,
                                   UIKeyboardDidChangeFrameNotification]) {
        [NSNotificationCenter.defaultCenter addObserverForName:n object:nil queue:NSOperationQueue.mainQueue usingBlock:^(NSNotification *note) {
            [weakSelf log:note.name keyboard:note.userInfo[UIKeyboardFrameEndUserInfoKey]];
        }];
    }

    // Matches the decided Host setup: edge-to-edge WKWebView, the web layer owns insets.
    self.web = [[WKWebView alloc] initWithFrame:self.view.bounds configuration:[WKWebViewConfiguration new]];
    self.web.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    self.web.scrollView.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentNever;
    self.web.inspectable = YES;
    [self.view addSubview:self.web];
    [self.web loadRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:@"http://localhost:8765/?host=wk"]]];
}

- (void)viewDidLayoutSubviews { [super viewDidLayoutSubviews]; [self log:@"viewDidLayoutSubviews" keyboard:nil]; }
@end

@interface SceneDelegate : UIResponder <UIWindowSceneDelegate>
@property (nonatomic) UIWindow *window;
@end
@implementation SceneDelegate
- (void)scene:(UIScene *)scene willConnectToSession:(UISceneSession *)s options:(UISceneConnectionOptions *)o {
    self.window = [[UIWindow alloc] initWithWindowScene:(UIWindowScene *)scene];
    self.window.rootViewController = [ProbeVC new];
    [self.window makeKeyAndVisible];
}
@end

@interface AppDelegate : UIResponder <UIApplicationDelegate>
@end
@implementation AppDelegate
- (UISceneConfiguration *)application:(UIApplication *)a configurationForConnectingSceneSession:(UISceneSession *)s options:(UISceneConnectionOptions *)o {
    UISceneConfiguration *c = [[UISceneConfiguration alloc] initWithName:@"Default" sessionRole:s.role];
    c.delegateClass = SceneDelegate.class;
    return c;
}
@end

int main(int argc, char *argv[]) {
    @autoreleasepool { return UIApplicationMain(argc, argv, nil, NSStringFromClass(AppDelegate.class)); }
}
